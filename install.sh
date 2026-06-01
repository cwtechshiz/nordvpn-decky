#!/bin/sh

# Target the user's home directory plugin path
PLUGIN_DIR="$HOME/homebrew/plugins/nordvpn-decky"
DOWNLOAD_URL="https://github.com/cwtechshiz/nordvpn-decky/releases/latest/download/nordvpn-decky.zip"

echo "Downloading latest NordVPN Decky Plugin..."
mkdir -p /tmp/nordvpn-decky-install

# Download the zip release asset
curl -L "$DOWNLOAD_URL" -o /tmp/nordvpn-decky-install/plugin.zip

echo "Extracting files to Decky environment (requires sudo)..."
# Decky root service owns this folder, so sudo is required to modify it
sudo mkdir -p "$PLUGIN_DIR"
sudo rm -rf "$PLUGIN_DIR"/*

# Extracting directly into $PLUGIN_DIR maps your flat ZIP layout perfectly!
sudo unzip -q /tmp/nordvpn-decky-install/plugin.zip -d "$PLUGIN_DIR"

# Clean up temporary files
rm -rf /tmp/nordvpn-decky-install

echo "Installation complete! Please reload your plugins in Decky Loader set
tings."
