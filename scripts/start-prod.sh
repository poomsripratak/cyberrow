#!/bin/bash

# CyberRow Flow Production Startup Script
# For Raspberry Pi deployment in kiosk mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==================================="
echo "CyberRow Flow Production Environment"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down all processes...${NC}"

    # Kill all background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$SIMULATOR_PID" ]; then
        kill $SIMULATOR_PID 2>/dev/null || true
    fi
    if [ ! -z "$ELECTRON_PID" ]; then
        kill $ELECTRON_PID 2>/dev/null || true
    fi

    echo -e "${GREEN}All processes stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if running on Raspberry Pi
if [ -f /proc/device-tree/model ]; then
    MODEL=$(cat /proc/device-tree/model)
    echo -e "${GREEN}Running on: $MODEL${NC}"
fi

# Create Python virtual environment if it doesn't exist
VENV_DIR="$PROJECT_DIR/python/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Ensure dependencies are installed
pip install -q -r "$PROJECT_DIR/python/requirements.txt"

# Build renderer if needed
if [ ! -d "$PROJECT_DIR/renderer/dist" ]; then
    echo -e "${YELLOW}Building renderer...${NC}"
    cd "$PROJECT_DIR/renderer"
    npm run build
fi

# Build electron if needed
if [ ! -d "$PROJECT_DIR/electron/dist" ]; then
    echo -e "${YELLOW}Building electron...${NC}"
    cd "$PROJECT_DIR/electron"
    npm run build
fi

# Start Python backend
echo -e "${GREEN}Starting Python backend...${NC}"
cd "$PROJECT_DIR"
python -m python.backend.main &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 2

# Start simulator if enabled
if [ "${SIMULATOR:-true}" = "true" ]; then
    echo -e "${GREEN}Starting packet simulator...${NC}"
    if [ "${SIMULATOR_ZERO:-false}" = "true" ]; then
        python -m python.simulator.main --zero &
    else
        PRESET="${SIMULATOR_PRESET:-intermediate}"
        python -m python.simulator.main --preset "$PRESET" &
    fi
    SIMULATOR_PID=$!
    echo "  Simulator PID: $SIMULATOR_PID"
    sleep 1
fi

# Start Electron in kiosk mode
echo -e "${GREEN}Starting Electron app in kiosk mode...${NC}"
cd "$PROJECT_DIR/electron"
npm run start -- --kiosk &
ELECTRON_PID=$!
echo "  Electron PID: $ELECTRON_PID"

echo ""
echo "==================================="
echo -e "${GREEN}CyberRow Flow started in production mode!${NC}"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for any process to exit
wait
