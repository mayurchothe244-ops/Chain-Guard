import React, { useState } from "react";
import { Cpu, Plus, ArrowUpRight, ShieldCheck, AlertCircle } from "lucide-react";
import { registerDevice, advanceDeviceMinVersion } from "../api";

export default function DeviceList({ devices, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Form states
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newDeviceModel, setNewDeviceModel] = useState("ESP32-GridMeter-Pro");
  const [initialMinVersion, setInitialMinVersion] = useState("200");

  const [targetNewVersion, setTargetNewVersion] = useState("");
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);
    try {
      await registerDevice(newDeviceId, newDeviceModel, Number(initialMinVersion));
      setActionSuccess(`Device ${newDeviceId} successfully registered on blockchain!`);
      setShowAddModal(false);
      setNewDeviceId("");
      onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceVersion = async (e) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);
    try {
      await advanceDeviceMinVersion(selectedDevice.deviceId, Number(targetNewVersion));
      setActionSuccess(
        `Advanced minimum accepted version for ${selectedDevice.deviceId} to ${targetNewVersion}`
      );
      setShowAdvanceModal(false);
      onRefresh();
    } catch (err) {
      setActionError(`On-Chain Revert: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdvanceModal = (device) => {
    setSelectedDevice(device);
    setTargetNewVersion(device.minAcceptedVersion + 100);
    setActionError(null);
    setShowAdvanceModal(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Device Registry</h1>
          <p className="page-description">
            Monitored hardware endpoints, device models, and monotonic minimum version baselines.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Register New Device
        </button>
      </div>

      {actionSuccess && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid var(--accent-green)",
            color: "var(--accent-green)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
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
          {actionError}
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Device Identifier</th>
              <th>Hardware Model</th>
              <th>Min Accepted Version</th>
              <th>Owner / Operator</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                  No devices registered yet. Click "Register New Device" or "Seed Demo Data".
                </td>
              </tr>
            ) : (
              devices.map((dev) => (
                <tr key={dev.deviceId}>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {dev.deviceId}
                  </td>
                  <td>{dev.deviceModel}</td>
                  <td>
                    <span className="badge badge-approved mono">
                      Code: {dev.minAcceptedVersion} (v{(dev.minAcceptedVersion / 100).toFixed(1)}.0)
                    </span>
                  </td>
                  <td className="mono" style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                    {dev.owner ? `${dev.owner.slice(0, 6)}...${dev.owner.slice(-4)}` : "System"}
                  </td>
                  <td>
                    <span className={`badge ${dev.isActive ? "badge-active" : "badge-revoked"}`}>
                      {dev.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openAdvanceModal(dev)}
                    >
                      <ArrowUpRight size={14} /> Advance Min Version
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Register Device */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Register IoT Device</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegisterDevice}>
              <div className="form-group">
                <label className="form-label">Device Identifier</label>
                <input
                  className="form-input mono"
                  placeholder="e.g. SMART-METER-002"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hardware Device Model</label>
                <input
                  className="form-input"
                  placeholder="e.g. ESP32-GridMeter-Pro"
                  value={newDeviceModel}
                  onChange={(e) => setNewDeviceModel(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Minimum Accepted Version Code</label>
                <input
                  className="form-input mono"
                  type="number"
                  placeholder="100 for v1.0, 200 for v2.0"
                  value={initialMinVersion}
                  onChange={(e) => setInitialMinVersion(e.target.value)}
                  required
                />
                <small style={{ color: "var(--text-dim)", display: "block", marginTop: "4px" }}>
                  Versions below this integer will be rejected by the on-chain anti-downgrade engine.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Registering on Ledger..." : "Register on Blockchain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Advance Min Version */}
      {showAdvanceModal && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Advance Monotonic Minimum Version</h2>
              <button
                onClick={() => setShowAdvanceModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "1.25rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Target Device: <strong style={{ color: "var(--text-main)" }}>{selectedDevice.deviceId}</strong>
              <br />
              Current Minimum Version:{" "}
              <strong style={{ color: "var(--accent-amber)" }}>
                {selectedDevice.minAcceptedVersion}
              </strong>
            </div>

            <form onSubmit={handleAdvanceVersion}>
              <div className="form-group">
                <label className="form-label">New Minimum Version Code</label>
                <input
                  className="form-input mono"
                  type="number"
                  value={targetNewVersion}
                  onChange={(e) => setTargetNewVersion(e.target.value)}
                  required
                />
                <small style={{ color: "var(--text-dim)", display: "block", marginTop: "4px" }}>
                  Rule: Must be strictly greater than {selectedDevice.minAcceptedVersion}. Lowering version will revert with <strong>InvalidVersionRollback</strong>.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAdvanceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting to Blockchain..." : "Update Minimum Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
