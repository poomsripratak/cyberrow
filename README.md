# CyberRow Flow

Professional rowing metrics application built with Electron, React, TypeScript, and Python.

## Prerequisites

- **Node.js** 18+ with npm
- **Python** 3.10+
- **macOS** or **Linux** (Raspberry Pi supported)

## Architecture

```
Electron App (Kiosk Mode)
    React + TypeScript UI
           │
    Node.js Main Process
    (ZeroMQ SUB/REQ)
           │
      ZeroMQ
           │
    Python Backend
    (Metrics + SQLite)
           │
      ZeroMQ
           │
    Packet Simulator
```

## Quick Start

### Development

```bash
# Install dependencies
npm install
python3 -m venv python/.venv
source python/.venv/bin/activate
pip install -r python/requirements.txt

# Start all components (recommended)
./scripts/start-dev.sh
```

### Manual Startup (Step-by-Step)

If the startup script doesn't work, run each component manually in separate terminals:

```bash
# Terminal 1: Python Backend
source python/.venv/bin/activate
python -m python.backend.main

# Terminal 2: Packet Simulator
source python/.venv/bin/activate
python -m python.simulator.main --preset intermediate

# Terminal 3: React Dev Server
cd renderer && npm run dev

# Terminal 4: Electron App
cd electron && npm run build && NODE_ENV=development npx electron . --dev
```

### Production (Raspberry Pi)

```bash
# Build and run in kiosk mode
./scripts/start-prod.sh
```

## Ports & Addresses

| Component       | Port | Protocol | Description                    |
| --------------- | ---- | -------- | ------------------------------ |
| Backend PUB     | 5555 | ZeroMQ   | Metrics broadcast to Electron  |
| Backend REP     | 5556 | ZeroMQ   | Command handling from Electron |
| Simulator PUB   | 5557 | ZeroMQ   | Sensor data to Backend         |
| Vite Dev Server | 5173 | HTTP     | React development server       |

## Project Structure

```
rowproject/
├── package.json          # Root package.json (npm workspaces)
├── electron/             # Electron main process
│   ├── main.ts          # Main process + ZeroMQ
│   └── preload.ts       # Context bridge for IPC
├── renderer/             # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks
│   │   ├── stores/      # Zustand state
│   │   └── types/       # TypeScript types
│   └── vite.config.ts
├── python/
│   ├── backend/         # Python backend server
│   │   ├── main.py     # Entry point
│   │   ├── server.py   # ZeroMQ server
│   │   ├── metrics.py  # Metric computation
│   │   ├── session.py  # Session management
│   │   └── database.py # SQLite persistence
│   └── simulator/       # Packet simulator
│       ├── main.py     # Entry point
│       ├── generator.py # Packet generation
│       └── config.py   # Simulator presets
└── scripts/
    ├── start-dev.sh    # Development startup
    ├── start-prod.sh   # Production startup
    └── cyberrow.service  # systemd service
```

## Communication Protocols

### Sensor Data (Simulator → Backend)

```json
{
  "type": "sensor_data",
  "timestamp": 1705849200000,
  "stroke_rate": 24,
  "power": 185,
  "stroke_length": 1.25,
  "drive_time": 0.82,
  "recovery_time": 1.68,
  "peak_force": 450
}
```

### Computed Metrics (Backend → Electron)

```json
{
  "type": "metrics_update",
  "session": {
    "elapsed_time": 125.5,
    "distance": 520,
    "calories": 21
  },
  "current": {
    "stroke_rate": 24,
    "power": 185,
    "split_500m": 118.5,
    "drive_recovery_ratio": 0.49
  },
  "stroke_analysis": {
    "stroke_length": 1.25,
    "peak_force": 450,
    "smoothness": 87,
    "symmetry": 94
  }
}
```

### Commands (Electron → Backend)

```json
{
  "type": "command",
  "action": "start_session" | "pause_session" | "stop_session" | "get_history"
}
```

## Simulator Presets

- `beginner` - Lower power, more variation
- `intermediate` - Balanced metrics (default)
- `advanced` - Higher power, smoother technique
- `sprint` - High intensity, faster fatigue
- `endurance` - Steady pace, slower fatigue

```bash
python -m python.simulator.main --preset sprint
```

## Raspberry Pi Setup

1. Install the systemd service:

```bash
sudo cp scripts/cyberrow.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cyberrow
sudo systemctl start cyberrow
```

2. Check status:

```bash
sudo systemctl status cyberrow
```

## Development

### Running Individual Components

```bash
# Backend only
npm run python:backend

# Simulator only
npm run python:simulator

# Renderer dev server
npm run dev:renderer

# Electron
npm run dev:electron
```

### Building

```bash
# Build all
npm run build

# Build renderer only
npm run build:renderer

# Build electron only
npm run build:electron
```

## Keyboard Shortcuts

- `ESC` - Exit kiosk mode (development)
- `Ctrl+Shift+D` - Toggle DevTools

## Environment Variables

- `SIMULATOR=true|false` - Enable/disable packet simulator
- `SIMULATOR_PRESET=<preset>` - Simulator preset name
- `NODE_ENV=development|production` - Node environment

## Troubleshooting

### Session shows 0 distance/metrics

- Ensure the Python backend is running and connected to simulator
- Restart the backend: `pkill -f "python.*backend" && python -m python.backend.main`

### Electron can't connect to backend

- Check backend is running: `ps aux | grep python.*backend`
- Verify ports 5555 and 5556 are available

### ZeroMQ errors

- Ensure zeromq is properly installed: `pip install pyzmq`
- For Electron: `npm install zeromq` in the electron directory

### Stopping all processes

```bash
pkill -f "Electron.*cyberrow"
pkill -f "python.*backend"
pkill -f "python.*simulator"
pkill -f "node.*vite"
```

## License

MIT
