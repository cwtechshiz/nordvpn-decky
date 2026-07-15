import os
import subprocess
import logging
import pwd
import shutil  # Added to check for binary installation pathing

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
        try:
            return pwd.getpwuid(1000).pw_name
        except Exception as e:
            logging.error(f"UID 1000 lookup failed ({e}), attempting environment fallback...")
            real_user = os.environ.get("SUDO_USER")
            if not real_user or real_user == "root":
                real_user = os.environ.get("USER")
            if not real_user or real_user == "root":
                return "deck"
            return real_user

    @classmethod
    def _run_nord_command(cls, args):
        try:
            target_user = cls._get_real_user()
            cmd = ["sudo", "-H", "-u", target_user] + args
            logging.info(f"Executing CLI invocation: {' '.join(cmd)}")
            return subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("utf-8")
        except subprocess.CalledProcessError as e:
            error_output = e.output.decode("utf-8") if e.output else str(e)
            logging.error(f"NordVPN command execution failure: {error_output}")
            raise Exception(error_output)

    async def get_status(self):
        """
        Queries connection state, but first verifies if NordVPN is installed on the OS.
        """
        try:
            # Check system pathing and common direct system directories for the binary
            is_installed = (
                shutil.which("nordvpn") is not None or 
                os.path.exists("/usr/bin/nordvpn") or 
                os.path.exists("/usr/local/bin/nordvpn")
            )
            
            status_map = {
                "installed": is_installed,
                "connected": False,
                "server": "N/A",
                "country": "N/A",
                "city": "N/A",
                "ip": "N/A",
                "protocol": "N/A"
            }
            
            if not is_installed:
                logging.warning("NordVPN binary was not detected on this system environment.")
                return status_map

            raw_vpn = Plugin._run_nord_command(["nordvpn", "status"])
            
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
            return {"error": str(e), "installed": True}

    async def get_meshnet_status(self):
        try:
            # Check installation setup before running settings command
            if not shutil.which("nordvpn") and not os.path.exists("/usr/bin/nordvpn"):
                return {"enabled": False}
                
            raw_mesh = Plugin._run_nord_command(["nordvpn", "settings"])
            return {"enabled": "meshnet: enabled" in raw_mesh.lower()}
        except Exception as e:
            logging.error(f"Exception in get_meshnet_status engine: {str(e)}")
            return {"error": str(e), "enabled": False}

    async def connect(self, country=None):
        try:
            cmd = ["nordvpn", "connect"]
            if country is not None and isinstance(country, str) and country.strip():
                cmd.append(country.strip())
            
            output = Plugin._run_nord_command(cmd)
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def disconnect(self):
        try:
            output = Plugin._run_nord_command(["nordvpn", "disconnect"])
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def toggle_meshnet(self, enabled: bool):
        try:
            toggle_state = "on" if enabled else "off"
            output = Plugin._run_nord_command(["nordvpn", "set", "meshnet", toggle_state])
            return {"success": True, "output": output}
        except Exception as e:
            return {"success": False, "error": str(e)}