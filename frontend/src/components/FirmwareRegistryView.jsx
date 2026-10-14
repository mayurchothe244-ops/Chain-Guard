import React, { useState } from "react";
import { Plus, Check, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import { approveFirmware, revokeFirmware } from "../api";
import RegisterFirmwareModal from "./RegisterFirmwareModal";

export default function FirmwareRegistryView({
  firmwares,
  sampleFirmwares,
  onRefresh,
}) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleApprove = async (firmwareId) => {
    setActionError(null);
    setLoadingId(firmwareId);
    try {
      await approveFirmware(firmwareId);
      setActionSuccess("Firmware approved successfully by Security Auditor role!");
      onRefresh();
    } catch (err) {
      setActionError(`Approval Failed: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRevoke = async (firmwareId) => {
    const reason = prompt(
      "Enter reason for firmware revocation (e.g. CVE-2026-XXXX zero-day discovered):",
      "CVE-2026-9999: Remote buffer overflow defect identified in communications stack"
    );
    if (!reason) return;

    setActionError(null);
    setLoadingId(firmwareId);
    try {
      await revokeFirmware(firmwareId, reason);
      setActionSuccess(`Firmware revoked: "${reason}"`);
      onRefresh();
    } catch (err) {
      setActionError(`Revocation Failed: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const truncateHash = (hash) => {
    if (!hash) return "";
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Firmware Provenance Registry</h1>
          <p className="page-description">
            Cryptographic SHA-256 hashes, release manifests, and multi-party security auditor approvals.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)}>
          <Plus size={16} /> Register Firmware Release
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
          }}
        >
          {actionSuccess}
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
              <th>Version</th>
              <th>Version Code</th>
              <th>Target Model</th>
              <th>SHA-256 Digest</th>
              <th>Auditor Status</th>
              <th>Revocation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {firmwares.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                  No firmware entries registered. Click "Register Firmware Release" or "Seed Demo Data".
                </td>
              </tr>
            ) : (
              firmwares.map((fw) => (
                <tr key={fw.firmwareId}>
                  <td style={{ fontWeight: 700 }}>v{fw.versionString}</td>
                  <td>
                    <span className="mono" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                      {fw.versionCode}
                    </span>
                  </td>
                  <td>{fw.deviceModel}</td>
                  <td className="mono" title={fw.sha256Hash} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {truncateHash(fw.sha256Hash)}
                  </td>
                  <td>
                    {fw.isApproved ? (
                      <span className="badge badge-approved">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    ) : (
                      <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}>
                        Pending Auditor
                      </span>
                    )}
                  </td>
                  <td>
                    {fw.isRevoked ? (
                      <span className="badge badge-downgrade">
                        <ShieldAlert size={12} /> REVOKED
                      </span>
                    ) : (
                      <span className="badge badge-verified">Active</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {!fw.isApproved && !fw.isRevoked && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--accent-green)", borderColor: "var(--accent-green)" }}
                          disabled={loadingId === fw.firmwareId}
                          onClick={() => handleApprove(fw.firmwareId)}
                        >
                          <Check size={12} /> Approve
                        </button>
                      )}
                      {!fw.isRevoked && (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={loadingId === fw.firmwareId}
                          onClick={() => handleRevoke(fw.firmwareId)}
                        >
                          <ShieldAlert size={12} /> Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RegisterFirmwareModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRefresh={onRefresh}
        sampleFirmwares={sampleFirmwares}
      />
    </div>
  );
}
