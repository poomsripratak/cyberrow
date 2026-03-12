#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

trap 'echo; echo -e "${YELLOW}Shutting down...${NC}"; kill 0; exit 0' INT TERM

echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:5555 -ti:5556 -ti:5557 -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

if ! command -v python3 &>/dev/null; then echo -e "${RED}Error: python3 required${NC}"; exit 1; fi
if ! command -v npm &>/dev/null; then echo -e "${RED}Error: npm required${NC}"; exit 1; fi

VENV_DIR="$PROJECT_DIR/python/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python venv...${NC}"
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
pip install -q -r "$PROJECT_DIR/python/requirements.txt" 2>/dev/null

if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing npm packages...${NC}"
    npm install --silent --prefix "$PROJECT_DIR" 2>/dev/null
fi

echo -e "${GREEN}Starting backend...${NC}"
cd "$PROJECT_DIR/python"
PYTHONUNBUFFERED=1 python -m backend 2>&1 | tr -d '\r' &
sleep 2

if [ "${SIMULATOR:-true}" = "true" ]; then
    echo -e "${GREEN}Starting simulator...${NC}"
    PYTHONUNBUFFERED=1 python -m simulator --demo 2>&1 | tr -d '\r' &
fi
sleep 1

echo -e "${GREEN}Starting renderer...${NC}"
cd "$PROJECT_DIR/renderer"
npm run dev >/dev/null 2>&1 &
sleep 3

echo -e "${GREEN}Starting app...${NC}"
cd "$PROJECT_DIR/electron"
npm run build --silent 2>/dev/null

echo ""
echo -e "${GREEN}CyberRow Flow running!${NC}"
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop"
echo ""

# Run Electron in the foreground — Ctrl+C kills it directly, trap cleans up the rest
NODE_ENV=development npm run start -- --dev 2>&1 | tr -d '\r'
