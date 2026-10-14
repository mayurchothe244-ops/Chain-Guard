import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Lock,
  FileX2,
  KeyRound,
  UserX,
  ArrowUpCircle,
  Undo2,
} from "lucide-react";
import { runDemoScenario, seedDemoEnvironment } from "../api";

export default function AttackSimulator({ onRefresh }) {
  const [runningScenarioId, setRunningScenarioId] = useState(null);
  const [scenarioResults, setScenarioResults] = useState({});
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(null);

  const scenarios = [
    {
      id: 1,
      title: "Scenario 1: Valid Baseline Firmware",
      icon: <ShieldCheck size={20} color="var(--accent-green)" />,
      badge: "Baseline",
      badgeClass: "badge-verified",
      description: "Submit authentic Firmware v2.0.0 with valid Ed25519 signature against device baseline minVersion 200.",
      expected: "VERIFIED / APPROVED FOR INSTALLATION",
      talkingPoint: "Demonstrates standard compliant operational OTA update where all 6 security layers pass.",
    },
    {
      id: 2,
      title: "Scenario 2: The Downgrade Attack",
      icon: <ShieldAlert size={20} color="var(--accent-red)" />,
      badge: "Critical Threat",
      badgeClass: "badge-downgrade",
      description: "Attacker transmits legitimately vendor-signed Firmware v1.0.0 (versionCode 100) to device expecting minVersion 200.",
      expected: "REJECTED — DOWNGRADE ATTACK DETECTED",
      talkingPoint: "Crucial Insight: Digital signature alone is VALID, but blockchain monotonic policy strictly blocks vulnerable old code.",
    },
    {
      id: 3,
      title: "Scenario 3: Firmware Binary Tampering",
      icon: <FileX2 size={20} color="var(--accent-amber)" />,
      badge: "Integrity Violation",
      badgeClass: "badge-tampered",
      description: "Attacker modifies 1 single byte in Firmware v2.0.0 (e.g. injected shellcode or disabled auth flag).",
      expected: "REJECTED — HASH MISMATCH",
      talkingPoint: "Proves SHA-256 binary hash mismatch between raw file payload and immutable blockchain ledger record.",
    },
    {
      id: 4,
      title: "Scenario 4: Rogue / Untrusted Signature",
      icon: <KeyRound size={20} color="var(--accent-purple)" />,
      badge: "Authenticity Violation",
      badgeClass: "badge-invalid-sig",
      description: "Firmware binary signed with an unauthorized developer or attacker private key instead of Trusted Vendor root.",
      expected: "REJECTED — INVALID SIGNATURE",
      talkingPoint: "Cryptographic Ed25519 public key pinning verifies origin provenance and prevents supply-chain injection.",
    },
    {
      id: 5,
      title: "Scenario 5: Unauthorized Auditor Approval",
      icon: <UserX size={20} color="var(--accent-red)" />,
      badge: "Access Control",
      badgeClass: "badge-downgrade",
      description: "Rogue account attempts to invoke approveFirmware() on smart contract without SECURITY_AUDITOR_ROLE.",
      expected: "REVERTED — AccessControlUnauthorizedAccount",
      talkingPoint: "Multi-party trust: Firmware publishers cannot unilaterally deploy without independent auditor sign-off.",
    },
    {
      id: 6,
      title: "Scenario 6: Valid Upgrade to v3.0.0",
      icon: <ArrowUpCircle size={20} color="var(--accent-cyan)" />,
      badge: "Upgrade Path",
      badgeClass: "badge-active",
      description: "Auditor approves Firmware v3.0.0 (versionCode 300). Update executes and advances device minAcceptedVersion to 300.",
      expected: "ACCEPTED — MIN VERSION ADVANCED TO 300",
      talkingPoint: "Demonstrates legitimate forward advancement: raises device low-water mark permanently.",
    },
    {
      id: 7,
      title: "Scenario 7: Minimum Version Rollback Attempt",
      icon: <Undo2 size={20} color="var(--accent-red)" />,
      badge: "Rollback Exploit",
      badgeClass: "badge-downgrade",
      description: "After device minAcceptedVersion is set to 300, rogue operator attempts to set it back to 200.",
      expected: "REJECTED — InvalidVersionRollback",
      talkingPoint: "Smart contract enforces strict monotonic increase: require(newMinVersion > currentMinVersion). Rollback impossible.",
    },
    {
      id: 8,
      title: "Scenario 8: Revoked Firmware Defense",
      icon: <Lock size={20} color="var(--accent-amber)" />,
      badge: "Emergency Revocation",
      badgeClass: "badge-tampered",
      description: "Auditor revokes previously approved release due to zero-day CVE-2026-9991. Attacker attempts installation.",
      expected: "REJECTED — FIRMWARE REVOKED",
      talkingPoint: "Immediate network-wide revocation prevents compromised builds from ever being flashed to field units.",
    },
  ];

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedSuccess(null);
    try {
      const res = await seedDemoEnvironment();
      setSeedSuccess(res.message);
      onRefresh();
    } catch (err) {
      alert(`Seed failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRunScenario = async (id) => {
    setRunningScenarioId(id);
    try {
      const res = await runDemoScenario(id);
      setScenarioResults((prev) => ({ ...prev, [id]: res }));
      onRefresh();
    } catch (err) {
      setScenarioResults((prev) => ({
        ...prev,
        [id]: { overallStatus: "EXECUTION_ERROR", rejectionReason: err.message },
      }));
    } finally {
      setRunningScenarioId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">BLOCKHACK 2026 Attack Simulation Suite</h1>
          <p className="page-description">
            Live interactive demonstrations of the Downgrade Attack, binary tampering, rogue keys, and monotonic ledger guards.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSeed} disabled={isSeeding}>
          <Sparkles size={16} /> {isSeeding ? "Seeding Demo Data..." : "Prepare Demo Environment"}
        </button>
      </div>

      {seedSuccess && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid var(--accent-green)",
            color: "var(--accent-green)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.5rem",
          }}
        >
          ✓ {seedSuccess} (Baseline: SMART-METER-001 at Min Version 200). Ready for live judge demonstration!
        </div>
      )}

      {/* 8 Scenario Cards in 2-Column Responsive Grid */}
      <div className="grid-cols-2">
        {scenarios.map((sc) => {
          const result = scenarioResults[sc.id];
          const isRunning = runningScenarioId === sc.id;

          return (
            <div key={sc.id} className="scenario-card">
              <span className={`scenario-badge ${sc.badgeClass}`}>{sc.badge}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  {sc.icon}
                  <h3>{sc.title}</h3>
                </div>
                <p className="scenario-desc">{sc.description}</p>
                <div className="scenario-expected">
                  <strong>Expected Outcome:</strong> {sc.expected}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
                  <strong>Judge Talking Point:</strong> {sc.talkingPoint}
                </div>
              </div>

              <div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={isRunning}
                  onClick={() => handleRunScenario(sc.id)}
                >
                  <Play size={14} /> {isRunning ? "Executing Real Blockchain Workflow..." : "Execute Scenario"}
                </button>

                {result && (
                  <div
                    className={`scenario-output ${
                      result.overallStatus.includes("REJECTED") ||
                      result.overallStatus.includes("PREVENTED") ||
                      result.overallStatus.includes("MISMATCH") ||
                      result.overallStatus.includes("REVOKED") ||
                      result.overallStatus.includes("DETECTED")
                        ? "danger"
                        : ""
                    }`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong>Status:</strong>
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {result.overallStatus}
                      </span>
                    </div>

                    {result.rejectionReason && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <strong>Diagnostic:</strong> {result.rejectionReason}
                      </div>
                    )}

                    {result.onChainTx && (
                      <div className="mono" style={{ fontSize: "0.7rem", color: "var(--accent-green)", marginTop: "4px" }}>
                        Tx: {result.onChainTx.txHash.slice(0, 20)}... | Block #{result.onChainTx.blockNumber}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
