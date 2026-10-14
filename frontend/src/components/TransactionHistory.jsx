import React from "react";
import { History, RefreshCw, CheckCircle2, XCircle, ShieldAlert, Cpu, FileCode } from "lucide-react";

export default function TransactionHistory({ events, onRefresh, isLoading }) {
  const getEventIcon = (name) => {
    switch (name) {
      case "UpdateAuthorized":
        return <CheckCircle2 size={16} color="var(--accent-green)" />;
      case "UpdateRejected":
        return <XCircle size={16} color="var(--accent-red)" />;
      case "FirmwareRevoked":
        return <ShieldAlert size={16} color="var(--accent-amber)" />;
      case "DeviceRegistered":
      case "DeviceMinVersionUpdated":
        return <Cpu size={16} color="var(--accent-cyan)" />;
      default:
        return <FileCode size={16} color="var(--accent-purple)" />;
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
          <h1 className="page-title">Immutable Audit Trail</h1>
          <p className="page-description">
            On-chain ledger events, authorization receipts, version increments, and rejection logs.
          </p>
        </div>
        <button className="btn btn-outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh Events
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Event Type</th>
              <th>Block</th>
              <th>Transaction Hash</th>
              <th>Event Parameters & Arguments</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-dim)" }}>
                  No blockchain events recorded yet. Run a verification or seed demo data to populate audit trail.
                </td>
              </tr>
            ) : (
              events.map((ev, idx) => (
                <tr key={`${ev.transactionHash}-${idx}`}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                      {getEventIcon(ev.eventName)}
                      <span>{ev.eventName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="mono badge badge-active">#{ev.blockNumber}</span>
                  </td>
                  <td className="mono" title={ev.transactionHash} style={{ color: "var(--accent-cyan)", fontSize: "0.8rem" }}>
                    {truncateHash(ev.transactionHash)}
                  </td>
                  <td className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {Object.entries(ev.args || {})
                      .filter(([k]) => isNaN(k)) // filter numeric tuple indices
                      .map(([k, v]) => (
                        <span key={k} style={{ marginRight: "12px", display: "inline-block" }}>
                          <strong style={{ color: "var(--text-dim)" }}>{k}:</strong>{" "}
                          <span style={{ color: "var(--text-main)" }}>
                            {typeof v === "object" ? v.toString() : String(v)}
                          </span>
                        </span>
                      ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
