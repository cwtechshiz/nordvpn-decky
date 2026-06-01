import subprocess
import decky_plugin

class Plugin:
    # Target the native path. Privilege dropping forces Game Mode to respect
    # the deck user configuration while manually attaching the nordvpn group context.
    NORDVPN_PATH = "/usr/bin/nordvpn"
    BASE_CMD = ["sudo", "-u", "deck", "-g", "nordvpn", NORDVPN_PATH]

    async def get_status(self) -> dict:
        """Get current NordVPN connection and Meshnet status"""
        try:
            # 1. Fetch connection status
            result = subprocess.run(
                self.BASE_CMD + ["status"],
                capture_output=True, text=True, timeout=10
            )
            output = result.stdout.strip()

            # 2. Fetch global settings to extract Meshnet toggle state
            settings_result = subprocess.run(
                self.BASE_CMD + ["settings"],
                capture_output=True, text=True, timeout=10
            )
            settings_output = settings_result.stdout.strip()
            
            meshnet_enabled = False
            for line in settings_output.splitlines():
                if "Meshnet:" in line:
                    meshnet_enabled = "enabled" in line.lower()

            status = {
                "connected": False,
                "server": None,
                "country": None,
                "city": None,
                "ip": None,
                "technology": None,
                "protocol": None,
                "meshnet_enabled": meshnet_enabled,
                "raw": output
            }

            for line in output.splitlines():
                line = line.strip()
                if line.startswith("Status:"):
                    status["connected"] = "Connected" in line
                elif line.startswith("Server:"):
                    status["server"] = line.split(":", 1)[1].strip()
                elif line.startswith("Country:"):
                    status["country"] = line.split(":", 1)[1].strip()
                elif line.startswith("City:"):
                    status["city"] = line.split(":", 1)[1].strip()
                elif line.startswith("Your new IP:"):
                    status["ip"] = line.split(":", 1)[1].strip()
                elif line.startswith("Current technology:"):
                    status["technology"] = line.split(":", 1)[1].strip()
                elif line.startswith("Current protocol:"):
                    status["protocol"] = line.split(":", 1)[1].strip()

            return {"success": True, "status": status}

        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "NordVPN binary not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def set_meshnet(self, enabled: bool) -> dict:
        """Toggle NordVPN Meshnet on or off"""
        try:
            target_state = "on" if enabled else "off"
            result = subprocess.run(
                self.BASE_CMD + ["set", "meshnet", target_state],
                capture_output=True, text=True, timeout=15
            )
            output = result.stdout.strip()
            return {
                "success": result.returncode == 0,
                "message": output or result.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def connect(self, country: str = None) -> dict:
        """Connect to NordVPN server"""
        try:
            cmd = self.BASE_CMD + ["c"]
            if country:
                cmd.append(country)

            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=20
            )
            output = result.stdout.strip()
            return {
                "success": result.returncode == 0,
                "message": output or result.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def disconnect(self) -> dict:
        """Disconnect from NordVPN server"""
        try:
            result = subprocess.run(
                self.BASE_CMD + ["d"],
                capture_output=True, text=True, timeout=15
            )
            output = result.stdout.strip()
            success = result.returncode == 0 or "disconnected" in output.lower()

            return {
                "success": success,
                "message": output or result.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_countries(self) -> dict:
        """Get list of available countries"""
        try:
            result = subprocess.run(
                self.BASE_CMD + ["countries"],
                capture_output=True, text=True, timeout=15
            )

            output = result.stdout.strip()
            countries = []
            for part in output.replace("\n", ",").split(","):
                c = part.strip()
                if c and not c.startswith("-"):
                    countries.append(c)

            return {"success": True, "countries": sorted(countries)}

        except Exception as e:
            return {"success": False, "error": str(e), "countries": []}

    async def _main(self):
        decky_plugin.logger.info("NordVPN plugin loaded")

    async def _unload(self):
        decky_plugin.logger.info("NordVPN plugin unloaded")