#!/bin/sh

# Target the parent plugins directory
PLUGINS_DIR="$HOME/homebrew/plugins"
PLUGIN_DIR="$PLUGINS_DIR/nordvpn-decky"
DOWNLOAD_URL="https://github.com/cwtechshiz/nordvpn-decky/releases/latest/download/nordvpn-decky.zip"

echo "Downloading latest NordVPN Decky Plugin..."
mkdir -p /tmp/nordvpn-decky-install

# Download the zip release asset
curl -L "$DOWNLOAD_URL" -o /tmp/nordvpn-decky-install/plugin.zip

echo "Extracting files to Decky environment (requires sudo)..."
# Ensure the parent homebrew plugins directory exists
sudo mkdir -p "$PLUGINS_DIR"

# Wipe the pre-existing directory entirely to ensure clean updates
sudo rm -rf "$PLUGIN_DIR"

# Extract directly into PLUGINS_DIR. 
# Since the zip has a "nordvpn-decky" folder, it will cleanly extract as "$PLUGINS_DIR/nordvpn-decky"
sudo unzip -q /tmp/nordvpn-decky-install/plugin.zip -d "$PLUGINS_DIR"

# Clean up temporary files
rm -rf /tmp/nordvpn-decky-install

echo "Installation complete! Please reload your plugins in Decky Loader settings."
