#!/usr/bin/env bash
set -euo pipefail

# Install script for the "desi" CLI

APP_NAME="desi"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

echo "==> Installing $APP_NAME CLI..."

# 1. Check for Bun
if ! command -v bun &>/dev/null; then
  echo "Error: Bun is required but not installed."
  echo "Install it from https://bun.sh  (curl -fsSL https://bun.sh/install | bash)"
  exit 1
fi

# 2. Install dependencies
echo "==> Installing dependencies..."
bun install

# 3. Build the standalone binary
echo "==> Building standalone binary..."
bun run build

# 4. Install the binary
echo "==> Installing binary to $INSTALL_DIR/$APP_NAME"
if [ -w "$INSTALL_DIR" ]; then
  cp dist/$APP_NAME "$INSTALL_DIR/$APP_NAME"
else
  echo "    (requires sudo)"
  sudo cp dist/$APP_NAME "$INSTALL_DIR/$APP_NAME"
fi
chmod +x "$INSTALL_DIR/$APP_NAME"

echo "==> Done! Run '$APP_NAME --version' to verify."
