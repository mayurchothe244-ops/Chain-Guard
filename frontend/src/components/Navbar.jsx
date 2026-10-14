import React from "react";
import {
  Shield,
  Cpu,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  History,
  Activity,
} from "lucide-react";

export default function Navbar({ activeTab, setActiveTab, systemStatus }) {
  const isConnected = systemStatus?.blockchainConnected;
  const contractAddress = systemStatus?.contractAddress;
  const chainName = systemStatus?.network?.name || "Localhost (Hardhat)";
  const currentBlock = systemStatus?.network?.currentBlock;

  const truncateAddress = (addr) => {
    if (!addr || addr.length < 10) return addr || "Not Deployed";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Shield className="nav-logo-icon" />
        <div>
          <div className="nav-title">
            Chain<span>Guard</span>
          </div>
          <div className="nav-subtitle">IoT Downgrade Protection</div>
        </div>
      </div>

      <div className="nav-links">
        <button
          className={`nav-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Activity size={16} /> Overview
        </button>
        <button
          className={`nav-btn ${activeTab === "devices" ? "active" : ""}`}
          onClick={() => setActiveTab("devices")}
        >
          <Cpu size={16} /> IoT Devices
        </button>
        <button
          className={`nav-btn ${activeTab === "firmware" ? "active" : ""}`}
          onClick={() => setActiveTab("firmware")}
        >
          <FileCode size={16} /> Firmware Registry
        </button>
        <button
          className={`nav-btn ${activeTab === "verify" ? "active" : ""}`}
          onClick={() => setActiveTab("verify")}
        >
          <CheckCircle2 size={16} /> Verification Gateway
        </button>
        <button
          className={`nav-btn ${activeTab === "attacks" ? "active" : ""}`}
          onClick={() => setActiveTab("attacks")}
        >
          <AlertTriangle size={16} /> Attack Simulator
        </button>
        <button
          className={`nav-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <History size={16} /> Audit Trail
        </button>
      </div>

      <div className="nav-status">
        <div className="network-pill" title={contractAddress}>
          <span className={`status-dot ${isConnected ? "" : "offline"}`} />
          <span>{isConnected ? chainName : "Node Offline"}</span>
          {isConnected && currentBlock !== null && (
            <span style={{ color: "var(--text-dim)", marginLeft: "4px" }}>
              #{currentBlock}
            </span>
          )}
        </div>

        {isConnected && contractAddress && (
          <div
            className="network-pill mono"
            style={{ color: "var(--accent-green)", cursor: "pointer" }}
            title={`Contract Address: ${contractAddress}`}
            onClick={() => navigator.clipboard.writeText(contractAddress)}
          >
            {truncateAddress(contractAddress)}
          </div>
        )}
      </div>
    </nav>
  );
}
