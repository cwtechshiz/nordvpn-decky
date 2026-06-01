#!/bin/sh

# Dynamically target the current user's home directory
PLUGIN_DIR="$HOME/homebrew/plugins/nordvpn-decky"
DOWNLOAD_URL="https://github.com/cwtechshiz/nordvpn-decky/releases/latest/download/nordvpn-decky.zip"

echo "Downloading latest NordVPN Decky Plugin for profile: $USER..."
mkdir -p /tmp/nordvpn-decky-install

# Download the zip release asset
curl -L "$DOWNLOAD_URL" -o /tmp/nordvpn-decky-install/plugin.zip

echo "Extracting files to Decky environment at: $PLUGIN_DIR"
# Clean up any old version first
mkdir -p "$PLUGIN_DIR"
rm -rf "$PLUGIN_DIR"/*

# Unzip straight into the dynamic plugins folder path
unzip -q /tmp/nordvpn-decky-install/plugin.zip -d "$HOME/homebrew/plugins/"

# Clean up temp working files
rm -rf /tmp/nordvpn-decky-install

echo "Installation complete! Please reload your plugins in Decky Loader sett
ings."
