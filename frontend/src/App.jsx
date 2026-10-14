import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import DashboardOverview from "./components/DashboardOverview";
import DeviceList from "./components/DeviceList";
import FirmwareRegistryView from "./components/FirmwareRegistryView";
import FirmwareUploadVerification from "./components/FirmwareUploadVerification";
import AttackSimulator from "./components/AttackSimulator";
import TransactionHistory from "./components/TransactionHistory";
import {
  fetchStatus,
  fetchDevices,
  fetchFirmwares,
  fetchEvents,
  fetchSampleFirmwares,
  seedDemoEnvironment,
} from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [systemStatus, setSystemStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [firmwares, setFirmwares] = useState([]);
  const [events, setEvents] = useState([]);
  const [sampleFirmwares, setSampleFirmwares] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = async () => {
    try {
      const [statusRes, devRes, fwRes, evRes, samplesRes] = await Promise.allSettled([
        fetchStatus(),
        fetchDevices(),
        fetchFirmwares(),
        fetchEvents(),
        fetchSampleFirmwares(),
      ]);

      if (statusRes.status === "fulfilled") setSystemStatus(statusRes.value);
      if (devRes.status === "fulfilled") setDevices(devRes.value.devices || []);
      if (fwRes.status === "fulfilled") setFirmwares(fwRes.value.firmwares || []);
      if (evRes.status === "fulfilled") setEvents(evRes.value.events || []);
      if (samplesRes.status === "fulfilled") setSampleFirmwares(samplesRes.value.samples || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000); // Polling telemetry every 5s
    return () => clearInterval(interval);
  }, []);

  const handleSeedDemo = async () => {
    try {
      await seedDemoEnvironment();
      await loadAllData();
      alert("Demo environment seeded successfully! Check Overview, Devices, and Attack Simulator.");
    } catch (err) {
      alert(`Seed error: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
      />

      {systemStatus && !systemStatus.blockchainConnected && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.2)",
            borderBottom: "1px solid var(--accent-red)",
            color: "#fca5a5",
            padding: "0.75rem 2rem",
            fontSize: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            ⚠️ <strong>Hardhat Node Offline:</strong> Local blockchain RPC is not responding at http://127.0.0.1:8545. Run <code>npm run node</code> to start the local chain.
          </span>
        </div>
      )}

      <main className="main-content">
        {activeTab === "overview" && (
          <DashboardOverview
            devices={devices}
            firmwares={firmwares}
            systemStatus={systemStatus}
            onNavigate={setActiveTab}
            onSeedDemo={handleSeedDemo}
          />
        )}

        {activeTab === "devices" && (
          <DeviceList
            devices={devices}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === "firmware" && (
          <FirmwareRegistryView
            firmwares={firmwares}
            sampleFirmwares={sampleFirmwares}
            onRefresh={loadAllData}
          />
        )}

        {activeTab === "verify" && (
          <FirmwareUploadVerification
            devices={devices}
            firmwares={firmwares}
            sampleFirmwares={sampleFirmwares}
            onVerificationComplete={loadAllData}
          />
        )}

        {activeTab === "attacks" && (
          <AttackSimulator
            onRefresh={loadAllData}
          />
        )}

        {activeTab === "history" && (
          <TransactionHistory
            events={events}
            onRefresh={loadAllData}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
