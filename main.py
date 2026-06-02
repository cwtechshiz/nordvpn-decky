import os
import subprocess
import logging
import pwd  # Standard Linux user database module

# Configure Decky plugin log tracking
logging.basicConfig(
    filename="/tmp/nordvpn-decky.log", 
    format='[NordVPN-Backend] %(levelname)s: %(message)s', 
    level=logging.INFO
)

class Plugin:
    async def _main(self):
        logging.info("NordVPN plugin background runner successfully initialized.")

    async def _unload(self):
        logging.info("NordVPN plugin shutting down cleanly.")

    @classmethod
    def _get_real_user(cls):
        """
        Dynamically extracts the genuine primary user profile via system UID.
        This completely bypasses broken systemd environment contexts.
        """
        try:
            # Universal Linux standard: The primary user account is always UID 1000
            return pwd.getpwuid(1000).pw_name
        except Exception as e:
            logging.error(f"UID 1000 lookup failed ({e}), attempting environment fallback...")
            
            # Defensive fallbacks if UID mapping behaves unexpectedly
            real_user = os.environ.get("SUDO_USER")
            if not real_user or real_user == "root":
                real_user = os.environ.get("USER")
            if not real_user or real_user == "root":
                return "deck"  # Hard rock-bottom safe default
            return real_user

    @classmethod
    def _run_nord_command(cls, args):
        """
        Executes a native NordVPN CLI command under the true non-root user profile context.
        """
        try:
            target_user = cls._get_real_user()
            cmd = ["sudo", "-u", target_user] + args
            logging.info(f"Executing CLI invocation: {' '.join(cmd)}")
            return subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("utf-8")
        except subprocess.CalledProcessError as e:
            error_output = e.output.decode("utf-8") if e.output else str(e)
            logging.error(f"NordVPN command execution failure: {error_output}")
            raise Exception(error_output)

    async def get_status(self):
        """
        PURE VPN STATUS: Queries connection and network mapping state only.
        """
        try:
            raw_vpn = Plugin._run_nord_command(["nordvpn", "status"])
            
            status_map = {
                "connected": False,
                "server": "N/A",
                "country": "N/A",
                "city": "N/A",
                "ip": "N/A",
                "protocol": "N/A"
            }
            
            for line in raw_vpn.splitlines():
                line = line.strip()
                if "Status:" in line:
                    status_map["connected"] = "Connected" in line
                elif "Current server:" in line:
                    status_map["server"] = line.split(":", 1)[1].strip()
                elif "Country:" in line:
                    status_map["country"] = line.split(":", 1)[1].strip()
                elif "City:" in line:
                    status_map["city"] = line.split(":", 1)[1].strip()
                elif "Server IP:" in line:
                    status_map["ip"] = line.split(":", 1)[1].strip()
                elif "Current protocol:" in line:
                    status_map["protocol"] = line.split(":", 1)[1].strip()
                
            return status_map
        except Exception as e:
            logging.error(f"Global exception in get_status engine: {str(e)}")
            return {"error": str(e)}

    async def get_meshnet_status(self):
        """
        PURE MESHNET STATUS: Returns a clean boolean for the frontend toggle switch.
        """
        try:
            raw_mesh = Plugin._run_nord_command(["nordvpn", "settings"])
            # Returns a simple true/false state mapping directly to a UI Toggle
            return {"enabled": "meshnet: enabled" in raw_mesh.lower()}
        except Exception as e:
            logging.error(f"Exception in get_meshnet_status engine: {str(e)}")
            return {"error": str(e), "enabled": False}

    async def connect(self, country=None):
        """
        Triggers a connection request to the fastest node or a custom country target.
        """
        try:
            cmd = ["nordvpn", "connect"]
            if country and country.strip():
                cmd.append(country.strip())
            
            output = Plugin._run_nord_command(cmd)
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def disconnect(self):
        """
        Disconnects the active VPN session safely.
        """
        try:
            output = Plugin._run_nord_command(["nordvpn", "disconnect"])
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def toggle_meshnet(self, enabled: bool):
        """
        Modifies the local Meshnet overlay operational status.
        """
        try:
            toggle_state = "on" if enabled else "off"
            output = Plugin._run_nord_command(["nordvpn", "set", "meshnet", toggle_state])
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "error": str(e)}
