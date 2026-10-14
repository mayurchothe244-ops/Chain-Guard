const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const config = require("./config");

let provider = null;
let contractAbi = null;
let deployedInfo = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }
  return provider;
}

function loadContractArtifact() {
  if (contractAbi) return contractAbi;

  const artifactPath = path.join(
    config.artifactsDir,
    "FirmwareRegistry.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `FirmwareRegistry artifact not found at: ${artifactPath}. Please run "npx hardhat compile" first.`
    );
  }

  const fileContent = fs.readFileSync(artifactPath, "utf8");
  const parsed = JSON.parse(fileContent);
  contractAbi = parsed.abi;
  return contractAbi;
}

function loadDeployedAddress() {
  if (deployedInfo && deployedInfo.contractAddress) {
    return deployedInfo.contractAddress;
  }

  const pathsToTry = [
    config.deployedAddressPath,
    path.resolve(__dirname, "..", "deployed-address.json"),
    path.resolve(__dirname, "..", "..", "deployed-address.json"),
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf8");
        deployedInfo = JSON.parse(raw);
        if (deployedInfo.contractAddress) {
          return deployedInfo.contractAddress;
        }
      } catch (err) {
        console.warn(`Error reading ${p}:`, err.message);
      }
    }
  }

  return null;
}

async function isBlockchainConnected() {
  try {
    const prov = getProvider();
    await prov.getBlockNumber();
    return true;
  } catch (error) {
    return false;
  }
}

function getSigner(role = "admin") {
  const prov = getProvider();
  let key = config.deployerPrivateKey; // Default admin & operator

  if (role === "publisher") {
    key = config.publisherPrivateKey;
  } else if (role === "auditor") {
    key = config.auditorPrivateKey;
  } else if (role === "attacker") {
    // Hardhat Account #4 (unauthorized signer with no roles)
    key = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
  }

  return new ethers.Wallet(key, prov);
}

function getContract(role = null) {
  const address = loadDeployedAddress();
  if (!address) {
    throw new Error(
      "FirmwareRegistry contract address not found. Please deploy the contract first via 'npm run deploy:local'."
    );
  }

  const abi = loadContractArtifact();
  const prov = getProvider();

  if (!role) {
    return new ethers.Contract(address, abi, prov);
  }

  const signer = getSigner(role);
  return new ethers.Contract(address, abi, signer);
}

// -----------------------------------------------------------------------------
// Blockchain Operations
// -----------------------------------------------------------------------------

async function registerDevice(deviceId, deviceModel, initialMinVersion, role = "admin") {
  const contract = getContract(role);
  const tx = await contract.registerDevice(deviceId, deviceModel, initialMinVersion);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    deviceId,
    deviceModel,
    initialMinVersion,
  };
}

async function advanceDeviceMinVersion(deviceId, newMinVersion, role = "admin") {
  const contract = getContract(role);
  const tx = await contract.advanceDeviceMinVersion(deviceId, newMinVersion);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    deviceId,
    newMinVersion,
  };
}

async function registerFirmware(
  versionString,
  versionCode,
  sha256Hex,
  deviceModel,
  metadataUri = "",
  role = "publisher"
) {
  const contract = getContract(role);
  const formattedHash = sha256Hex.startsWith("0x") ? sha256Hex : "0x" + sha256Hex;

  const tx = await contract.registerFirmware(
    versionString,
    versionCode,
    formattedHash,
    deviceModel,
    metadataUri
  );
  const receipt = await tx.wait();

  // Find FirmwareRegistered event
  let firmwareId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "FirmwareRegistered") {
        firmwareId = parsed.args.firmwareId;
        break;
      }
    } catch (e) {
      // not our event, continue
    }
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    firmwareId,
    versionString,
    versionCode,
    sha256: sha256Hex,
  };
}

async function approveFirmware(firmwareId, role = "auditor") {
  const contract = getContract(role);
  const tx = await contract.approveFirmware(firmwareId);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    firmwareId,
  };
}

async function revokeFirmware(firmwareId, reason, role = "auditor") {
  const contract = getContract(role);
  const tx = await contract.revokeFirmware(firmwareId, reason);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    firmwareId,
    reason,
  };
}

async function verifyUpdatePolicy(deviceId, firmwareId, sha256Hex) {
  const contract = getContract();
  const formattedHash = sha256Hex.startsWith("0x") ? sha256Hex : "0x" + sha256Hex;
  const result = await contract.verifyUpdatePolicy(deviceId, firmwareId, formattedHash);
  return {
    isValid: result.isValid,
    statusCode: Number(result.statusCode),
    reason: result.reason,
  };
}

async function authorizeUpdate(
  deviceId,
  firmwareId,
  sha256Hex,
  autoAdvance = true,
  role = "admin"
) {
  const contract = getContract(role);
  const formattedHash = sha256Hex.startsWith("0x") ? sha256Hex : "0x" + sha256Hex;
  const tx = await contract.authorizeUpdate(
    deviceId,
    firmwareId,
    formattedHash,
    autoAdvance
  );
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === 1 ? "SUCCESS" : "REVERTED",
    deviceId,
    firmwareId,
  };
}

async function getAllDevices() {
  const contract = getContract();
  const deviceIds = await contract.getAllDeviceIds();
  const devices = [];
  for (const id of deviceIds) {
    const d = await contract.getDevice(id);
    devices.push({
      deviceId: d.deviceId,
      deviceModel: d.deviceModel,
      owner: d.owner,
      minAcceptedVersion: Number(d.minAcceptedVersion),
      lastUpdatedTimestamp: Number(d.lastUpdatedTimestamp),
      isActive: d.isActive,
    });
  }
  return devices;
}

async function getAllFirmwares() {
  const contract = getContract();
  const firmwareIds = await contract.getAllFirmwareIds();
  const firmwares = [];
  for (const id of firmwareIds) {
    const fw = await contract.getFirmware(id);
    firmwares.push({
      firmwareId: fw.firmwareId,
      versionString: fw.versionString,
      versionCode: Number(fw.versionCode),
      sha256Hash: fw.sha256Hash,
      deviceModel: fw.deviceModel,
      publisher: fw.publisher,
      isApproved: fw.isApproved,
      isRevoked: fw.isRevoked,
      releaseTimestamp: Number(fw.releaseTimestamp),
      metadataUri: fw.metadataUri,
    });
  }
  return firmwares;
}

async function getRecentEvents(limit = 50) {
  try {
    const contract = getContract();
    const currentBlock = await getProvider().getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 5000);

    const eventNames = [
      "DeviceRegistered",
      "DeviceMinVersionUpdated",
      "FirmwareRegistered",
      "FirmwareApproved",
      "FirmwareRevoked",
      "UpdateAuthorized",
      "UpdateRejected",
    ];

    const allEvents = [];
    for (const name of eventNames) {
      try {
        const filter = contract.filters[name]();
        const logs = await contract.queryFilter(filter, fromBlock, currentBlock);
        for (const log of logs) {
          const rawArgs = log.args ? log.args.toObject() : {};
          const serializedArgs = {};
          for (const [k, v] of Object.entries(rawArgs)) {
            serializedArgs[k] = typeof v === "bigint" ? v.toString() : v;
          }
          allEvents.push({
            eventName: name,
            blockNumber: Number(log.blockNumber),
            transactionHash: log.transactionHash,
            args: serializedArgs,
          });
        }
      } catch (err) {
        // Continue if single filter fails
      }
    }

    allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
    return allEvents.slice(0, limit);
  } catch (error) {
    console.error("Error querying events:", error.message);
    return [];
  }
}

module.exports = {
  getProvider,
  getSigner,
  getContract,
  loadDeployedAddress,
  isBlockchainConnected,
  registerDevice,
  advanceDeviceMinVersion,
  registerFirmware,
  approveFirmware,
  revokeFirmware,
  verifyUpdatePolicy,
  authorizeUpdate,
  getAllDevices,
  getAllFirmwares,
  getRecentEvents,
};
