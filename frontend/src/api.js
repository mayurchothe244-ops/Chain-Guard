const API_BASE = "/api";

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

export async function registerDevice(deviceId, deviceModel, initialMinVersion) {
  const res = await fetch(`${API_BASE}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, deviceModel, initialMinVersion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to register device");
  return data;
}

export async function advanceDeviceMinVersion(deviceId, newMinVersion) {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/advance-version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newMinVersion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to advance minimum version");
  return data;
}

export async function fetchFirmwares() {
  const res = await fetch(`${API_BASE}/firmwares`);
  if (!res.ok) throw new Error("Failed to fetch firmwares");
  return res.json();
}

export async function registerFirmware({
  versionString,
  versionCode,
  sha256,
  deviceModel,
  metadataUri,
}) {
  const res = await fetch(`${API_BASE}/firmwares/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      versionString,
      versionCode,
      sha256,
      deviceModel,
      metadataUri,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to register firmware");
  return data;
}

export async function approveFirmware(firmwareId) {
  const res = await fetch(`${API_BASE}/firmwares/${firmwareId}/approve`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to approve firmware");
  return data;
}

export async function revokeFirmware(firmwareId, reason) {
  const res = await fetch(`${API_BASE}/firmwares/${firmwareId}/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to revoke firmware");
  return data;
}

export async function verifyFirmwareUpload(formData) {
  const res = await fetch(`${API_BASE}/verify`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok && !data.overallStatus) {
    throw new Error(data.error || "Verification request failed");
  }
  return data;
}

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error("Failed to fetch audit events");
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchSampleFirmwares() {
  const res = await fetch(`${API_BASE}/demo/samples`);
  if (!res.ok) throw new Error("Failed to fetch sample firmwares");
  return res.json();
}

export async function seedDemoEnvironment() {
  const res = await fetch(`${API_BASE}/demo/seed`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to seed demo environment");
  return data;
}

export async function runDemoScenario(scenarioId) {
  const res = await fetch(`${API_BASE}/demo/run-scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
  const data = await res.json();
  if (!res.ok && !data.overallStatus) {
    throw new Error(data.error || "Failed to execute scenario");
  }
  return data;
}
