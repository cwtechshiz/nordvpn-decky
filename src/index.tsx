import {
  ButtonItem,
  definePlugin,
  DialogButton,
  Focusable,
  PanelSection,
  PanelSectionRow,
  Router,
  ServerAPI,
  staticClasses,
  TextField,
  ToggleField,
} from "decky-frontend-lib";
import { useEffect, useState, VFC } from "react";
import { FaShieldAlt } from "react-icons/fa";

interface VpnStatus {
  connected: boolean;
  server: string | null;
  country: string | null;
  city: string | null;
  ip: string | null;
  technology: string | null;
  protocol: string | null;
  meshnet_enabled: boolean;
  raw: string;
}

interface StatusResult {
  success: boolean;
  status?: VpnStatus;
  error?: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ── Styles injected into the page ──────────────────────────────────────────
const styles = `
  .nvpn-status-card {
    border-radius: 8px;
    padding: 12px 14px;
    margin: 4px 0 8px;
    transition: background 0.3s ease;
  }
  .nvpn-status-card.connected {
    background: linear-gradient(135deg, rgba(0,180,100,0.18) 0%, rgba(0,140,80,0.08) 100%);
    border-left: 4px solid #00b464;
  }
  .nvpn-status-card.disconnected {
    background: linear-gradient(135deg, rgba(255,85,85,0.12) 0%, rgba(200,50,50,0.05) 100%);
    border-left: 4px solid #ff5555;
  }
`;

// ── Main UI Component ───────────────────────────────────────────────────────
const Content: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const [status, setStatus] = useState<VpnStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showCountryInput, setShowCountryInput] = useState<boolean>(false);
  const [countryInput, setCountryInput] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      const res = (await serverAPI.callPluginMethod("get_status", {})) as StatusResult;
      if (res.success && res.status) {
        setStatus(res.status);
        setError(null);
      } else {
        setError(res.error || "Unknown error fetching status");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Initial load and polling loop
  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (!actionLoading) {
        fetchStatus();
      }
    }, 10000); // 10s polling rate
    return () => clearInterval(interval);
  }, [autoRefresh, actionLoading]);

  const handleConnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const targetCountry = showCountryInput && countryInput.strip ? countryInput.trim() : countryInput;
      const res = (await serverAPI.callPluginMethod("connect", {
        country: showCountryInput && targetCountry ? targetCountry : null,
      })) as ActionResult;

      if (!res.success) {
        setError(res.error || res.message || "Failed to connect");
      }
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = (await serverAPI.callPluginMethod("disconnect", {})) as ActionResult;
      if (!res.success) {
        setError(res.error || res.message || "Failed to disconnect");
      }
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMeshnetToggle = async (checked: boolean) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = (await serverAPI.callPluginMethod("set_meshnet", { enabled: checked })) as ActionResult;
      if (!res.success) {
        setError(res.error || res.message || "Failed to update Meshnet");
      }
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !status) {
    return <div style={{ padding: "20px", textAlignment: "center" as any }}>Loading NordVPN state...</div>;
  }

  const connected = status?.connected || false;

  return (
    <div style={{ marginTop: "40px" }}>
      <style>{styles}</style>

      {/* Connection Status Section */}
      <PanelSection title="Connection Status">
        <PanelSectionRow>
          <div className={`nvpn-status-card ${connected ? "connected" : "disconnected"}`}>
            <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>
              {connected ? "🔒 Securely Connected" : "🔓 Unprotected"}
            </div>
            {connected && status && (
              <div style={{ marginTop: "8px", fontSize: "0.9em", opacity: 0.85, display: "flex", flexDirection: "column", gap: "3px" }}>
                <div><strong>Server:</strong> {status.server}</div>
                <div><strong>Country:</strong> {status.country}</div>
                <div><strong>City:</strong> {status.city}</div>
                <div><strong>IP Address:</strong> {status.ip}</div>
                <div><strong>Protocol:</strong> {status.protocol} ({status.technology})</div>
              </div>
            )}
            {error && (
              <div style={{ color: "#ff5555", marginTop: "8px", fontSize: "0.85em" }}>
                Error: {error}
              </div>
            )}
          </div>
        </PanelSectionRow>

        {/* Dynamic Controls */}
        {!connected && (
          <>
            <PanelSectionRow>
              <ToggleField
                label="Target Specific Country"
                checked={showCountryInput}
                onChange={setShowCountryInput}
              />
            </PanelSectionRow>

            {showCountryInput && (
              <PanelSectionRow>
                <TextField
                  label="Country Name"
                  value={countryInput}
                  onChange={(e) => setCountryInput(e.target.value)}
                  placeholder="e.g., United_States"
                />
              </PanelSectionRow>
            )}

            <PanelSectionRow>
              <ButtonItem
                layout="below"
                onClick={handleConnect}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Connecting…"
                  : showCountryInput && countryInput
                  ? `Connect to ${countryInput}`
                  : "Connect (Best Server)"}
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}

        {connected && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={handleDisconnect}
              disabled={actionLoading}
            >
              {actionLoading ? "Disconnecting…" : "Disconnect"}
            </ButtonItem>
          </PanelSectionRow>
        )}
      </PanelSection>

      {/* Meshnet Infrastructure Section */}
      <PanelSection title="Meshnet Ecosystem">
        <PanelSectionRow>
          <ToggleField
            label="Enable Meshnet"
            description="Securely link your Deck with remote hardware systems"
            checked={status?.meshnet_enabled || false}
            disabled={actionLoading}
            onChange={handleMeshnetToggle}
          />
        </PanelSectionRow>
      </PanelSection>

      {/* Global Settings */}
      <PanelSection title="Settings">
        <PanelSectionRow>
          <ToggleField
            label="Auto Refresh"
            description="Poll status every 10 seconds"
            checked={autoRefresh}
            onChange={setAutoRefresh}
          />
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};

// ── Plugin entry point ───────────────────────────────────────────────────────
export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>NordVPN</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaShieldAlt />,
  };
});