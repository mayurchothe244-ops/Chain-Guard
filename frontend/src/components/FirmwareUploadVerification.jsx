import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  CheckCircle2,
  XCircle,
  Cpu,
  FileCode,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { verifyFirmwareUpload } from "../api";
import SimulatedIotDevice from "./SimulatedIotDevice";

export default function FirmwareUploadVerification({
  devices,
  firmwares,
  sampleFirmwares,
  onVerificationComplete,
}) {
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedFirmwareId, setSelectedFirmwareId] = useState("");
  const [selectedSample, setSelectedSample] = useState("");
  const [file, setFile] = useState(null);
  const [signatureHex, setSignatureHex] = useState("");
  const [executeOnChain, setExecuteOnChain] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  // Set default device and firmware when loaded
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].deviceId);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (firmwares.length > 0 && !selectedFirmwareId) {
      setSelectedFirmwareId(firmwares[0].firmwareId);
    }
  }, [firmwares, selectedFirmwareId]);

  // When a sample manifest is chosen, automatically set corresponding parameters
  const handleSelectSample = (filename) => {
    setSelectedSample(filename);
    const sample = sampleFirmwares.find((s) => s.filename === filename);
    if (sample) {
      setSignatureHex(sample.signature);
      // Auto-match firmwareId if registered
      const matchedFw = firmwares.find((f) => f.versionCode === sample.versionCode);
      if (matchedFw) {
        setSelectedFirmwareId(matchedFw.firmwareId);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSelectedSample(""); // Clear sample when user uploads manual file
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("firmwareFile", file);
      } else if (selectedSample) {
        formData.append("sampleFilename", selectedSample);
      } else {
        throw new Error("Please select a sample firmware or upload a binary file.");
      }

      formData.append("deviceId", selectedDeviceId);
      formData.append("firmwareId", selectedFirmwareId);
      formData.append("signatureHex", signatureHex);
      formData.append("executeOnChain", executeOnChain);
      formData.append("autoAdvance", autoAdvance);

      const result = await verifyFirmwareUpload(formData);
      setVerificationResult(result);
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentDevice = devices.find((d) => d.deviceId === selectedDeviceId);

  const getStatusBadge = (status) => {
    switch (status) {
      case "VERIFIED":
      case "APPROVED":
        return <span className="badge badge-verified">{status}</span>;
      case "DOWNGRADE ATTACK DETECTED":
        return <span className="badge badge-downgrade">DOWNGRADE ATTACK DETECTED</span>;
      case "HASH MISMATCH":
        return <span className="badge badge-hash-mismatch">HASH MISMATCH</span>;
      case "INVALID SIGNATURE":
        return <span className="badge badge-invalid-sig">INVALID SIGNATURE</span>;
      case "FIRMWARE REVOKED":
        return <span className="badge badge-revoked">FIRMWARE REVOKED</span>;
      default:
        return <span className="badge badge-downgrade">{status}</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Firmware Verification Gateway</h1>
          <p className="page-description">
            Cryptographic integrity, Ed25519 digital signature validation, and on-chain anti-downgrade policy.
          </p>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Verification Form Card */}
        <div className="card">
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem" }}>
            Submit Firmware for Policy Verification
          </h2>

          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--accent-red)",
                color: "var(--accent-red)",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1.25rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Target IoT Device</label>
              <select
                className="form-select mono"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                required
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceId} ({d.deviceModel}) — Min Ver: {d.minAcceptedVersion}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Firmware Metadata Record (Blockchain)</label>
              <select
                className="form-select mono"
                value={selectedFirmwareId}
                onChange={(e) => setSelectedFirmwareId(e.target.value)}
                required
              >
                {firmwares.map((f) => (
                  <option key={f.firmwareId} value={f.firmwareId}>
                    v{f.versionString} (Code: {f.versionCode}) — {f.deviceModel} {f.isRevoked ? "[REVOKED]" : !f.isApproved ? "[PENDING]" : "[APPROVED]"}
                  </option>
                ))}
              </select>
            </div>

            {/* Firmware File Selection: Sample or Custom Upload */}
            <div className="form-group">
              <label className="form-label">Firmware Binary Source</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                {sampleFirmwares.map((s) => (
                  <button
                    key={s.filename}
                    type="button"
                    className={`btn btn-sm mono ${selectedSample === s.filename ? "btn-primary" : "btn-outline"}`}
                    onClick={() => handleSelectSample(s.filename)}
                  >
                    {s.filename} {s.isTrustedSigner ? "" : "[Untrusted]"}
                  </button>
                ))}
              </div>

              <div
                style={{
                  border: "1px dashed var(--border-subtle)",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                  background: "var(--bg-input)",
                }}
              >
                <input
                  type="file"
                  id="fw-upload"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <label htmlFor="fw-upload" style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <Upload size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                  {file ? file.name : "Or choose custom .bin / .hex file"}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ed25519 Digital Signature (Hex)</label>
              <textarea
                className="form-textarea mono"
                rows={2}
                placeholder="64-byte Ed25519 hex signature"
                value={signatureHex}
                onChange={(e) => setSignatureHex(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={executeOnChain}
                  onChange={(e) => setExecuteOnChain(e.target.checked)}
                />
                Execute On-Chain Authorization Tx
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                />
                Auto-advance Device Min Version
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isLoading}>
              {isLoading ? "Running Security Verification Pipeline..." : "Execute Verification Pipeline"}
            </button>
          </form>
        </div>

        {/* Diagnostic Results Card & Simulated Device */}
        <div>
          {verificationResult ? (
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Verification Diagnostics</h2>
                {getStatusBadge(verificationResult.overallStatus)}
              </div>

              {verificationResult.rejectionReason && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    borderLeft: "4px solid var(--accent-red)",
                    padding: "0.75rem 1rem",
                    borderRadius: "4px",
                    marginBottom: "1.25rem",
                    fontSize: "0.85rem",
                    color: "#fca5a5",
                  }}
                >
                  <strong>Policy Verdict:</strong> {verificationResult.rejectionReason}
                </div>
              )}

              {/* Step by Step Breakdown */}
              <div style={{ marginBottom: "1.25rem" }}>
                {verificationResult.checks.map((chk, idx) => (
                  <div key={idx} className={`pipeline-step ${chk.passed ? "passed" : "failed"}`}>
                    <div className={`step-indicator ${chk.passed ? "passed" : "failed"}`}>
                      {chk.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                          {chk.name}
                        </strong>
                        <span className={`badge ${chk.passed ? "badge-verified" : "badge-downgrade"}`}>
                          {chk.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {chk.details}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* On-Chain Transaction Receipt */}
              {verificationResult.onChainTx && (
                <div
                  style={{
                    background: "var(--bg-input)",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div style={{ color: "var(--accent-green)", fontWeight: 700, marginBottom: "0.25rem" }}>
                    ✓ On-Chain Authorization Confirmed
                  </div>
                  <div className="mono" style={{ color: "var(--text-muted)" }}>
                    Tx Hash: {verificationResult.onChainTx.txHash}
                  </div>
                  <div className="mono" style={{ color: "var(--text-muted)" }}>
                    Block #{verificationResult.onChainTx.blockNumber} — Status: {verificationResult.onChainTx.status}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: "1.5rem", textAlign: "center", padding: "3rem 1.5rem" }}>
              <ShieldCheck size={48} color="var(--accent-green)" style={{ margin: "0 auto 1rem", opacity: 0.8 }} />
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Awaiting Firmware Verification</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Select a firmware file and target device on the left, then click "Execute Verification Pipeline"
                to run all 6 cryptographic and on-chain security checks.
              </p>
            </div>
          )}

          {/* Simulated Field Device OLED */}
          <div className="card">
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cpu size={18} color="var(--accent-cyan)" /> Simulated Field Hardware OLED Response
            </h3>
            <SimulatedIotDevice
              targetDevice={currentDevice}
              lastVerificationResult={verificationResult}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
