import React from "react";
import { Cpu, Terminal, Shield, AlertTriangle } from "lucide-react";

export default function SimulatedIotDevice({ targetDevice, lastVerificationResult }) {
  const minVer = targetDevice?.minAcceptedVersion || 200;
  const isDownGradeAttempt =
    lastVerificationResult?.overallStatus === "DOWNGRADE ATTACK DETECTED";
  const isSuccess =
    lastVerificationResult?.overallStatus === "VERIFIED" ||
    lastVerificationResult?.overallStatus === "APPROVED";

  return (
    <div className="oled-screen">
      <div className="oled-header">
        <span>DEVICE: {targetDevice?.deviceId || "SMART-METER-001"}</span>
        <span style={{ color: "#a5b4fc" }}>ARCH: ESP32-XTENSA</span>
      </div>

      <div className="oled-body">
        <div className="oled-line">
          <span>MODEL:</span>
          <span>{targetDevice?.deviceModel || "ESP32-GridMeter-Pro"}</span>
        </div>
        <div className="oled-line">
          <span>SECURE BOOT:</span>
          <span style={{ color: "#4ade80" }}>ENABLED (v2)</span>
        </div>
        <div className="oled-line">
          <span>MIN ACCEPTED VER:</span>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>
            {minVer} ({`v${(minVer / 100).toFixed(1)}.0`})
          </span>
        </div>
        <div className="oled-line">
          <span>HW MONOTONIC FUSE:</span>
          <span>OTP_BLOCK_04: 0x{minVer.toString(16).toUpperCase()}</span>
        </div>

        {/* Dynamic Bootloader Reaction based on last verification */}
        {lastVerificationResult && (
          <div>
            {isDownGradeAttempt && (
              <div className="oled-alert">
                [!] OTA FLASH BLOCKED: DOWNGRADE ATTACK VIOLATION!
                <br />
                Attempted: {lastVerificationResult.checks?.find(c => c.name.includes("Anti-Downgrade"))?.details || "Version rejected"}
              </div>
            )}

            {isSuccess && (
              <div className="oled-ok">
                [✓] OTA AUTH SUCCESS: PROVENANCE VERIFIED BY LEDGER
                <br />
                Safe for partition write. Monotonic fuse synced.
              </div>
            )}

            {!isDownGradeAttempt && !isSuccess && lastVerificationResult.rejectionReason && (
              <div className="oled-alert">
                [X] OTA REJECTED: {lastVerificationResult.rejectionReason}
              </div>
            )}
          </div>
        )}

        {!lastVerificationResult && (
          <div
            style={{
              color: "#64748b",
              textAlign: "center",
              marginTop: "0.5rem",
              fontStyle: "italic",
            }}
          >
            [STANDBY] Awaiting cryptographically authorized OTA broadcast...
          </div>
        )}
      </div>
    </div>
  );
}
