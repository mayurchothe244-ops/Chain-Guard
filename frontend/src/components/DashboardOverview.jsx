import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Layers,
  FileCheck2,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import SimulatedIotDevice from "./SimulatedIotDevice";

export default function DashboardOverview({
  devices,
  firmwares,
  systemStatus,
  onNavigate,
  onSeedDemo,
}) {
  const stats = systemStatus?.stats || {};
  const approvedCount = firmwares.filter((f) => f.isApproved && !f.isRevoked).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Command Center</h1>
          <p className="page-description">
            Real-time telemetry, immutable IoT provenance, and hardware downgrade protection.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={onSeedDemo}>
            <Sparkles size={16} color="var(--accent-cyan)" /> Seed Demo Data
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate("verify")}>
            <ShieldCheck size={16} /> Verification Gateway
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-cols-4">
        <div className="card stat-card">
          <div className="stat-icon-wrapper" style={{ color: "var(--accent-cyan)" }}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="stat-value">{devices.length}</div>
            <div className="stat-label">Registered Devices</div>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon-wrapper" style={{ color: "var(--accent-green)" }}>
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="stat-value">{approvedCount}</div>
            <div className="stat-label">Approved Releases</div>
          </div>
        </div>

        <div className="card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              color: "var(--accent-red)",
              background: "rgba(239, 68, 68, 0.1)",
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ color: "var(--accent-red)" }}>
              {stats.rejectedDowngradeAttacks || 0}
            </div>
            <div className="stat-label">Downgrades Blocked</div>
          </div>
        </div>

        <div className="card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              color: "var(--accent-amber)",
              background: "rgba(245, 158, 11, 0.1)",
            }}
          >
            <Lock size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ color: "var(--accent-amber)" }}>
              {stats.hashMismatches || 0}
            </div>
            <div className="stat-label">Tampering Detected</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Hardware Simulation & Architecture */}
      <div className="grid-cols-2">
        {/* Virtual IoT Device Status */}
        <div className="card">
          <h2
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Cpu size={20} color="var(--accent-cyan)" /> Live Hardware Simulation
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Real-time simulated OLED screen of field device{" "}
            <strong style={{ color: "var(--text-main)" }}>SMART-METER-001</strong> executing
            OTA bootloader checks.
          </p>
          <SimulatedIotDevice
            targetDevice={
              devices.find((d) => d.deviceId === "SMART-METER-001") ||
              devices[0] || {
                deviceId: "SMART-METER-001",
                deviceModel: "ESP32-GridMeter-Pro",
                minAcceptedVersion: 200,
                isActive: true,
              }
            }
          />
        </div>

        {/* Multi-Party Trust Architecture */}
        <div className="card">
          <h2
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Layers size={20} color="var(--accent-green)" /> Multi-Party Trust Architecture
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-input)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--accent-cyan)",
              }}
            >
              <strong style={{ color: "var(--text-main)" }}>
                1. Firmware Publisher (Vendor)
              </strong>
              <div style={{ color: "var(--text-muted)" }}>
                Builds binary, signs with Ed25519 key, and registers SHA-256 metadata on-chain.
                Cannot self-approve for safety.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-input)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--accent-purple)",
              }}
            >
              <strong style={{ color: "var(--text-main)" }}>
                2. Security Auditor / Compliance Body
              </strong>
              <div style={{ color: "var(--text-muted)" }}>
                Validates security assertions, verifies vulnerability disclosures, and executes
                on-chain approval or revocation.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-input)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--accent-green)",
              }}
            >
              <strong style={{ color: "var(--text-main)" }}>
                3. Smart Contract Consensus Engine
              </strong>
              <div style={{ color: "var(--text-muted)" }}>
                Enforces immutable monotonic version policy. Strictly reverts any attempt to
                install versions below the device's low-water mark.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-input)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--accent-amber)",
              }}
            >
              <strong style={{ color: "var(--text-main)" }}>
                4. Field IoT Gateway & Bootloader
              </strong>
              <div style={{ color: "var(--text-muted)" }}>
                Queries immutable ledger state before writing to flash memory. Prevents rogue
                operator rollback attacks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
