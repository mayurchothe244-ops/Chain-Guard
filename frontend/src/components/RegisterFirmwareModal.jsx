import React, { useState } from "react";
import { registerFirmware } from "../api";

export default function RegisterFirmwareModal({ isOpen, onClose, onRefresh, sampleFirmwares }) {
  const [versionString, setVersionString] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [sha256, setSha256] = useState("");
  const [deviceModel, setDeviceModel] = useState("ESP32-GridMeter-Pro");
  const [metadataUri, setMetadataUri] = useState("ipfs://QmNewFirmwareMetadata");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFillFromSample = (sample) => {
    setVersionString(sample.version);
    setVersionCode(sample.versionCode);
    setSha256(sample.sha256);
    setDeviceModel(sample.deviceModel);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await registerFirmware({
        versionString,
        versionCode: Number(versionCode),
        sha256: sha256.startsWith("0x") ? sha256 : "0x" + sha256,
        deviceModel,
        metadataUri,
      });
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2 className="modal-title">Register Firmware Metadata</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        {sampleFirmwares && sampleFirmwares.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Quick Fill from Generated Sample:
            </span>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
              {sampleFirmwares.map((s) => (
                <button
                  key={s.version}
                  type="button"
                  className="btn btn-outline btn-sm mono"
                  onClick={() => handleFillFromSample(s)}
                >
                  {s.version} ({s.versionCode})
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid var(--accent-red)",
              color: "var(--accent-red)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1.25rem",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Version String</label>
              <input
                className="form-input"
                placeholder="e.g. 2.1.0"
                value={versionString}
                onChange={(e) => setVersionString(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Version Code (Integer)</label>
              <input
                className="form-input mono"
                type="number"
                placeholder="e.g. 210"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">SHA-256 Digest (64 hex characters)</label>
            <input
              className="form-input mono"
              placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              value={sha256}
              onChange={(e) => setSha256(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Compatible Hardware Device Model</label>
            <input
              className="form-input"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Metadata URI / IPFS Hash</label>
            <input
              className="form-input mono"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Registering on Chain..." : "Submit to Ledger"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
