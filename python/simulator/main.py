"""Main entry point for the CyberRow Flow packet simulator."""

import argparse
import json
import signal
import sys
import time

import zmq

from .config import SimulatorConfig, PRESETS
from .generator import PacketGenerator
from .demo import DemoGenerator


def main():
    """Run the packet simulator."""
    parser = argparse.ArgumentParser(description="CyberRow Flow Packet Simulator")
    parser.add_argument(
        "--preset",
        choices=list(PRESETS.keys()),
        default="intermediate",
        help="Rowing preset (default: intermediate)",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Demo mode — scripted phases (warm-up, sprint, recovery) for video recording",
    )
    parser.add_argument(
        "--stroke-rate",
        type=float,
        help="Base stroke rate (spm)",
    )
    parser.add_argument(
        "--power",
        type=float,
        help="Base power (watts)",
    )
    parser.add_argument(
        "--hz",
        type=int,
        default=30,
        help="Realtime packet frequency in Hz (default: 30)",
    )
    parser.add_argument(
        "--address",
        default="tcp://*:5557",
        help="ZeroMQ PUB socket address (default: tcp://*:5557)",
    )
    parser.add_argument(
        "--no-foot-force",
        action="store_true",
        help="Disable foot force simulation",
    )
    parser.add_argument(
        "--realtime-only",
        action="store_true",
        help="Only send realtime packets (no stroke packets)",
    )
    parser.add_argument(
        "--stroke-only",
        action="store_true",
        help="Only send stroke packets (no realtime packets)",
    )
    parser.add_argument(
        "--zero",
        action="store_true",
        help="Send all-zero/idle values — useful for testing UI with no sensor data",
    )

    args = parser.parse_args()

    # Initialize ZeroMQ
    address = args.address
    context = zmq.Context()
    socket = context.socket(zmq.PUB)
    socket.bind(address)

    running = True

    def signal_handler(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        if args.demo:
            # Demo mode — scripted phases for video
            print("[simulator] Demo mode — phases loop every ~2 min")
            demo = DemoGenerator(enable_foot_force=not args.no_foot_force)
            for packet_dict in demo.generate_packets(realtime_hz=args.hz):
                if not running:
                    break
                socket.send_string(json.dumps(packet_dict))

        elif args.zero:
            # All-zero idle packets
            interval = 1.0 / args.hz
            while running:
                packet_dict = {
                    "type": "realtime",
                    "ts": int(time.time() * 1000),
                    "v": 0.0,
                    "fl": 0.0,
                    "fr": 0.0,
                    "slr": 50.0,
                    "sfb": 50.0,
                    "ta": 0.0,
                    "la": 0.0,
                    "ph": "recovery",
                    "ffl": 0.0,
                    "ffr": 0.0,
                }
                socket.send_string(json.dumps(packet_dict))
                time.sleep(interval)

        else:
            # Standard preset mode
            config = PRESETS.get(args.preset, SimulatorConfig())
            if args.stroke_rate:
                config.base_stroke_rate = args.stroke_rate
            if args.power:
                config.base_power = args.power

            generator = PacketGenerator(config, enable_foot_force=not args.no_foot_force)
            generator.start()

            interval = 1.0 / args.hz
            while running:
                packet = generator.generate_realtime_packet()

                if not args.stroke_only:
                    socket.send_string(json.dumps(packet.to_dict()))

                stroke = generator.check_stroke_complete(packet)
                if stroke and not args.realtime_only:
                    socket.send_string(json.dumps(stroke.to_dict()))

                time.sleep(interval)

    finally:
        socket.close()
        context.term()


if __name__ == "__main__":
    main()
