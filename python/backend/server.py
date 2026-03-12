"""ZeroMQ server for communication with Electron frontend and simulator."""

import json
import asyncio
import logging
import os
import sys
import zmq
import zmq.asyncio
from typing import Optional

from .session import SessionManager
from .database import Database

# Configure logging
logger = logging.getLogger(__name__)

# When SIMULATOR=false, read from USB serial instead of ZMQ
SIMULATOR = os.environ.get("SIMULATOR", "true").lower() != "false"
SERIAL_PORT = os.environ.get("SERIAL_PORT", "/dev/ttyUSB0")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "115200"))


class Server:
    """ZeroMQ server handling both PUB/SUB and REQ/REP patterns."""

    def __init__(
        self,
        pub_address: str = "tcp://*:5555",
        rep_address: str = "tcp://*:5556",
        sensor_sub_address: str = "tcp://127.0.0.1:5557",
    ):
        self.pub_address = pub_address
        self.rep_address = rep_address
        self.sensor_sub_address = sensor_sub_address

        # Initialize database and session manager
        self.db = Database()
        self.session_manager = SessionManager(self.db)

        # ZeroMQ context
        self.context: Optional[zmq.asyncio.Context] = None
        self.pub_socket: Optional[zmq.asyncio.Socket] = None
        self.rep_socket: Optional[zmq.asyncio.Socket] = None
        self.sensor_sub_socket: Optional[zmq.asyncio.Socket] = None

        self._running = False
        self._realtime_count = 0
        self._stroke_count = 0
        self._serial = None  # Active serial port, set by _process_serial_data

    async def start(self):
        """Start the ZeroMQ server."""
        self.context = zmq.asyncio.Context()

        # PUB socket for sending metrics to Electron
        self.pub_socket = self.context.socket(zmq.PUB)
        self.pub_socket.bind(self.pub_address)

        # REP socket for receiving commands from Electron
        self.rep_socket = self.context.socket(zmq.REP)
        self.rep_socket.bind(self.rep_address)

        self._running = True

        if SIMULATOR:
            # SUB socket for receiving sensor data from simulator
            self.sensor_sub_socket = self.context.socket(zmq.SUB)
            self.sensor_sub_socket.connect(self.sensor_sub_address)
            self.sensor_sub_socket.setsockopt_string(zmq.SUBSCRIBE, "")
            sensor_task = self._process_sensor_data()
        else:
            # Read from USB serial (master ESP32 connected via cable)
            sensor_task = self._process_serial_data()

        # Start processing loops
        await asyncio.gather(
            self._process_commands(),
            sensor_task,
            self._watch_keyboard(),
        )

    async def stop(self):
        """Stop the ZeroMQ server."""
        self._running = False

        if self.pub_socket:
            self.pub_socket.close()
        if self.rep_socket:
            self.rep_socket.close()
        if self.sensor_sub_socket:
            self.sensor_sub_socket.close()
        if self.context:
            self.context.term()

    async def _process_commands(self):
        """Process incoming commands from Electron frontend."""
        while self._running:
            try:
                message = await self.rep_socket.recv_string()
                response = await self._handle_command(message)
                await self.rep_socket.send_string(json.dumps(response))
            except zmq.ZMQError:
                if self._running:
                    await asyncio.sleep(0.1)
            except Exception as e:
                if self._running:
                    try:
                        await self.rep_socket.send_string(json.dumps({
                            "status": "error",
                            "message": str(e),
                        }))
                    except Exception as send_err:
                        logger.error(f"Failed to send error response: {send_err}")

    async def _handle_command(self, message: str) -> dict:
        """Handle a command from the frontend."""
        try:
            data = json.loads(message)
            action = data.get("action", "")

            if action == "start_session":
                result = self.session_manager.start_session()
                await self._publish_status(result)
                await self._publish_config()
                return result

            elif action == "pause_session":
                result = self.session_manager.pause_session()
                await self._publish_status(result)
                return result

            elif action == "stop_session":
                result = self.session_manager.stop_session()
                await self._publish_status(result)
                self._stroke_count = 0
                self._realtime_count = 0
                return result

            elif action == "get_history":
                sessions = self.session_manager.get_history()
                return {"status": "ok", "sessions": sessions}

            elif action == "delete_sessions":
                ids = data.get("ids", [])
                deleted = 0
                for session_id in ids:
                    if self.session_manager.db.delete_session(session_id):
                        deleted += 1
                return {"status": "ok", "deleted": deleted}

            elif action == "get_config":
                return self.session_manager.get_config()

            elif action == "update_config":
                config_data = data.get("config", {})
                result = self.session_manager.update_config(config_data)
                # Send updated config to ESP32
                await self._publish_config()
                return result

            elif action == "enable_realtime":
                # Quick toggle for game mode
                config = self.session_manager.config
                config.stream_realtime = data.get("enabled", True)
                config.realtime_hz = data.get("hz", 30)
                self.session_manager.update_config(config.__dict__)
                await self._publish_config()
                return {"status": "ok", "realtime_enabled": config.stream_realtime}

            elif action == "set_mode":
                mode_config = data.get("mode_config", {})
                result = self.session_manager.set_mode(mode_config)

                # If game mode, also update ESP32 config
                if mode_config.get("mode") == "game":
                    await self._publish_config()

                return result

            elif action == "get_mode":
                return self.session_manager.get_mode()

            elif action == "get_ghost_sessions":
                return self.session_manager.get_ghost_sessions()

            elif action == "game_collision":
                collision_type = data.get("collision_type", "")
                result = self.session_manager.mode_manager.handle_game_collision(collision_type)
                return {"status": "ok", **result}

            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

        except json.JSONDecodeError:
            return {"status": "error", "message": "Invalid JSON"}

    async def _publish_status(self, status: dict):
        """Publish session status to frontend."""
        if self.pub_socket:
            message = {
                "type": "session_status",
                **status,
            }
            await self.pub_socket.send_string(json.dumps(message))

    async def _publish_config(self):
        """Publish ESP32 configuration (for ESP32 to receive)."""
        if self.pub_socket:
            config = self.session_manager.config.to_dict()
            await self.pub_socket.send_string(json.dumps(config))

    async def _process_serial_data(self):
        """Read JSON lines from USB serial (master ESP32 via cable)."""
        import serial
        import serial.serialutil

        while self._running:
            ser = None
            try:
                import subprocess
                subprocess.run(["stty", "-F", SERIAL_PORT, str(SERIAL_BAUD), "raw"], check=False)
                ser = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)
                ser.setDTR(False)
                ser.setRTS(False)
                import time as _time; _time.sleep(0.2)
                ser.reset_input_buffer()
                self._serial = ser
                logger.warning(f"Serial connected: {SERIAL_PORT} at {SERIAL_BAUD} baud")
                while self._running:
                    line = await asyncio.get_event_loop().run_in_executor(
                        None, ser.readline
                    )
                    if not line:
                        continue
                    text = line.decode("utf-8", errors="ignore").strip()
                    # Lines starting with # are debug messages from the ESP32
                    if text.startswith("#") or not text:
                        if text:
                            logger.warning(f"ESP32: {text}")
                        continue
                    await self._handle_sensor_data(text)
            except serial.serialutil.SerialException as e:
                logger.warning(f"Serial error ({SERIAL_PORT}): {e} — retrying in 3s")
                await asyncio.sleep(3)
            except Exception as e:
                logger.error(f"Serial read error: {e}")
                await asyncio.sleep(1)
            finally:
                self._serial = None
                if ser and ser.is_open:
                    ser.close()

    async def _process_sensor_data(self):
        """Process incoming sensor data from simulator."""
        while self._running:
            try:
                message = await self.sensor_sub_socket.recv_string()
                await self._handle_sensor_data(message)
            except zmq.ZMQError:
                if self._running:
                    await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Error processing sensor data: {e}")

    def _send_tare_to_esp32(self):
        """Write 't' to the serial port so the ESP32 broadcasts tare to all slaves."""
        if self._serial and self._serial.is_open:
            self._serial.write(b't')
            logger.warning("Tare command sent to ESP32 via serial.")
        else:
            logger.warning("Tare requested but serial not connected.")

    def _read_one_key(self) -> str:
        """Block until a single keypress and return it (raw mode, Unix only)."""
        try:
            import tty
            import termios
            fd = sys.stdin.fileno()
            old = termios.tcgetattr(fd)
            try:
                tty.setraw(fd)
                return sys.stdin.read(1)
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old)
        except Exception:
            # stdin not a tty (e.g. running as a service) — block forever gracefully
            import time
            while self._running:
                time.sleep(1)
            return ''

    async def _watch_keyboard(self):
        """Watch for 'f' keypress and send tare command to ESP32."""
        if not sys.stdin.isatty():
            return  # Not an interactive terminal, skip

        loop = asyncio.get_event_loop()
        logger.warning("Keyboard watcher active: press 'f' to tare all slaves.")
        while self._running:
            char = await loop.run_in_executor(None, self._read_one_key)
            if char.lower() == 'f':
                self._send_tare_to_esp32()

    async def _handle_sensor_data(self, message: str):
        """Handle sensor data from ESP32/simulator."""
        try:
            data = json.loads(message)
            packet_type = data.get("type", "")

            if packet_type == "realtime":
                result = self.session_manager.process_realtime_data(data)
                if result and self.pub_socket:
                    result["type"] = "realtime_update"
                    await self.pub_socket.send_string(json.dumps(result))
                    self._realtime_count += 1

            elif packet_type == "stroke":
                result = self.session_manager.process_stroke_data(data)
                if result and self.pub_socket:
                    result["type"] = "metrics_update"
                    await self.pub_socket.send_string(json.dumps(result))
                    self._stroke_count += 1

            elif packet_type == "sensor_data":
                result = self.session_manager.process_sensor_data(data)
                if result and self.pub_socket:
                    result["type"] = "metrics_update"
                    await self.pub_socket.send_string(json.dumps(result))

        except json.JSONDecodeError as e:
            logger.warning(f"Malformed JSON in sensor data: {e}")
        except Exception as e:
            logger.error(f"Error handling sensor data: {e}")
