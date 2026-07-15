import {
  ButtonItem,
  definePlugin,
  Focusable,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  SliderField, // Imported the native Decky slider element
  staticClasses,
  TextField,
  ToggleField,
} from "decky-frontend-lib";
import { useEffect, useState, VFC } from "react";
import { FaShieldAlt } from "react-icons/fa";

interface VpnStatus {
  installed: boolean;
  connected: boolean;
  server: string;
  country: string;
  city: string;
  ip: string;
  protocol: string;
}

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
  .nvpn-alert-banner {
    background: rgba(255, 85, 85, 0.15);
    border: 1px solid #ff5555;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 12px;
    color: #ff5555;
    font-size: 0.9em;
  }
`;

const Content: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  const [status, setStatus] = useState<VpnStatus | null>(null);
  const [meshnetEnabled, setMeshnetEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showCountryInput, setShowCountryInput] = useState<boolean>(false);
  const [countryInput, setCountryInput] = useState<string>("");

  // Persisted state initializers utilizing standard local storage definitions
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    const saved = localStorage.getItem("nvpn_auto_refresh");
    return saved !== null ? saved === "true" : true;
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem("nvpn_refresh_interval");
    return saved !== null ? parseInt(saved, 10) : 10;
  });

  const fetchStatus = async () => {
    try {
      const res = await serverAPI.callPluginMethod("get_status", {}) as any;
      
      if (res && res.success && res.result) {
        if (!res.result.error) {
          setStatus(res.result);
          setStatusError(null);
        } else {
          setStatusError(res.result.error);
        }
      } else {
        setStatusError(res?.error || "Unknown error fetching status");
      }

      const meshRes = await serverAPI.callPluginMethod("get_meshnet_status", {}) as any;
      if (meshRes && meshRes.success && meshRes.result) {
        setMeshnetEnabled(!!meshRes.result.enabled);
      }
    } catch (err: any) {
      setStatusError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Dynamic interval loop tracking changes to the auto-refresh and timing configuration
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (!actionLoading) {
        fetchStatus();
      }
    }, refreshInterval * 1000); // Converts scalar seconds value to milliseconds
    return () => clearInterval(interval);
  }, [autoRefresh, actionLoading, refreshInterval]);

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked);
    localStorage.setItem("nvpn_auto_refresh", String(checked));
  };

  const handleRefreshIntervalChange = (value: number) => {
    setRefreshInterval(value);
    localStorage.setItem("nvpn_refresh_interval", String(value));
  };

  const handleConnect = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const targetCountry = countryInput.trim();
      const res = await serverAPI.callPluginMethod("connect", {
        country: showCountryInput && targetCountry ? targetCountry : null,
      }) as any;

      if (!res || !res.success || (res.result && !res.result.success)) {
        setActionError(res?.error || res?.result?.error || "Failed to connect");
      }
      await fetchStatus();
    } catch (err: any) {
      setActionError(err?.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await serverAPI.callPluginMethod("disconnect", {}) as any;
      if (!res || !res.success || (res.result && !res.result.success)) {
        setActionError(res?.error || res?.result?.error || "Failed to disconnect");
      }
      await fetchStatus();
    } catch (err: any) {
      setActionError(err?.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMeshnetToggle = async (checked: boolean) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await serverAPI.callPluginMethod("toggle_meshnet", { enabled: checked }) as any;
      if (!res || !res.success || (res.result && !res.result.success)) {
        setActionError(res?.error || res?.result?.error || "Failed to update Meshnet");
      }
      await fetchStatus();
    } catch (err: any) {
      setActionError(err?.message || String(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !status) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading NordVPN state...</div>;
  }

  const isInstalled = status?.installed ?? true;
  const connected = status?.connected || false;

  return (
    <div style={{ marginTop: "40px" }}>
      <style>{styles}</style>

      {/* Persistent Action Error Banner */}
      {actionError && (
        <div className="nvpn-alert-banner">
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>⚠️ Action Failure</div>
          <div>{actionError}</div>
          <div 
            style={{ textDecoration: "underline", marginTop: "6px", cursor: "pointer", fontSize: "0.85em" }}
            onClick={() => setActionError(null)}
          >
            Dismiss Error Notice
          </div>
        </div>
      )}

      {/* Global Status Error Display */}
      {statusError && (
        <div className="nvpn-alert-banner" style={{ background: "rgba(255,165,0,0.15)", borderColor: "orange", color: "orange" }}>
          <strong>Communication Warning:</strong> {statusError}
        </div>
      )}

      {/* System Installation Guard */}
      {!isInstalled ? (
        <PanelSection title="NordVPN System Missing">
          <PanelSectionRow>
            <div style={{ padding: "10px 0", color: "#ccc", fontSize: "0.95em", lineHeight: "1.4" }}>
              The NordVPN command-line client was not detected on this system partition. 
              <br /><br />
              Please ensure the <code>nordvpn</code> binary is installed via your package manager and the background daemon service is enabled before utilizing this plugin interface.
            </div>
          </PanelSectionRow>
        </PanelSection>
      ) : (
        <>
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
                    <div><strong>Protocol:</strong> {status.protocol}</div>
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
                checked={meshnetEnabled}
                disabled={actionLoading}
                onChange={handleMeshnetToggle}
              />
            </PanelSectionRow>
          </PanelSection>
        </>
      )}

      {/* Global Settings */}
      <PanelSection title="Settings">
        <PanelSectionRow>
          <ToggleField
            label="Auto Refresh"
            description="Poll NordVPN status in the background"
            checked={autoRefresh}
            onChange={handleAutoRefreshToggle}
          />
        </PanelSectionRow>
        
        {/* Conditional Slider rendering (only shows up if Auto Refresh is actively true) */}
        {autoRefresh && (
          <PanelSectionRow>
            <SliderField
              label="Polling Interval"
              description="Time in seconds between status synchronization"
              value={refreshInterval}
              min={5}
              max={60}
              step={5}
              showValue={true}
              onChange={handleRefreshIntervalChange}
            />
          </PanelSectionRow>
        )}
      </PanelSection>
    </div>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>NordVPN</div>,
    content: <Content serverAPI={serverApi} />,
    icon: <FaShieldAlt />,
  };
});