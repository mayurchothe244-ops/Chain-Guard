const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const blockchain = require("./blockchain");
const cryptoUtils = require("./cryptoUtils");
const { verifyFirmware } = require("./firmwareVerifier");

const router = express.Router();

// Configure Multer for file uploads (max 10MB memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Verification counters for dashboard telemetry
const statsTracker = {
  totalVerifications: 0,
  successfulAuthorizations: 0,
  rejectedDowngradeAttacks: 0,
  hashMismatches: 0,
  invalidSignatures: 0,
  revokedRejections: 0,
};

// -----------------------------------------------------------------------------
// SYSTEM STATUS
// -----------------------------------------------------------------------------
router.get("/status", async (req, res) => {
  try {
    const isConnected = await blockchain.isBlockchainConnected();
    const contractAddress = blockchain.loadDeployedAddress();

    let networkInfo = null;
    let blockNumber = null;

    if (isConnected) {
      const provider = blockchain.getProvider();
      const network = await provider.getNetwork();
      blockNumber = await provider.getBlockNumber();
      networkInfo = {
        name: network.name,
        chainId: network.chainId.toString(),
        currentBlock: blockNumber,
      };
    }

    res.json({
      status: "online",
      blockchainConnected: isConnected,
      contractAddress: contractAddress || "Not deployed",
      network: networkInfo,
      stats: statsTracker,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// DEVICES
// -----------------------------------------------------------------------------
router.get("/devices", async (req, res) => {
  try {
    const devices = await blockchain.getAllDevices();
    res.json({ success: true, count: devices.length, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/devices", async (req, res) => {
  try {
    const { deviceId, deviceModel, initialMinVersion } = req.body;
    if (!deviceId || !deviceModel || initialMinVersion === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: deviceId, deviceModel, initialMinVersion",
      });
    }

    const result = await blockchain.registerDevice(
      deviceId,
      deviceModel,
      Number(initialMinVersion)
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/devices/:id/advance-version", async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { newMinVersion } = req.body;

    if (newMinVersion === undefined) {
      return res.status(400).json({ success: false, error: "newMinVersion is required" });
    }

    const result = await blockchain.advanceDeviceMinVersion(
      deviceId,
      Number(newMinVersion)
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// FIRMWARES
// -----------------------------------------------------------------------------
router.get("/firmwares", async (req, res) => {
  try {
    const firmwares = await blockchain.getAllFirmwares();
    res.json({ success: true, count: firmwares.length, firmwares });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/firmwares/register", async (req, res) => {
  try {
    const { versionString, versionCode, sha256, deviceModel, metadataUri } = req.body;
    if (!versionString || !versionCode || !sha256 || !deviceModel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: versionString, versionCode, sha256, deviceModel",
      });
    }

    const result = await blockchain.registerFirmware(
      versionString,
      Number(versionCode),
      sha256,
      deviceModel,
      metadataUri || ""
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/firmwares/:id/approve", async (req, res) => {
  try {
    const firmwareId = req.params.id;
    const result = await blockchain.approveFirmware(firmwareId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/firmwares/:id/revoke", async (req, res) => {
  try {
    const firmwareId = req.params.id;
    const { reason } = req.body;
    const result = await blockchain.revokeFirmware(
      firmwareId,
      reason || "Security revocation"
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// VERIFICATION & AUTHORIZATION
// -----------------------------------------------------------------------------
router.post("/verify", upload.single("firmwareFile"), async (req, res) => {
  try {
    let fileBuffer = null;

    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else if (req.body.sampleFilename) {
      // Allow selecting generated sample firmware directly
      const samplePath = path.join(config.sampleFirmwareDir, req.body.sampleFilename);
      if (fs.existsSync(samplePath)) {
        fileBuffer = fs.readFileSync(samplePath);
      }
    }

    if (!fileBuffer) {
      return res.status(400).json({
        success: false,
        error: "No firmware file provided. Upload a binary or specify sampleFilename.",
      });
    }

    const {
      firmwareId,
      deviceId,
      signatureHex,
      executeOnChain,
      autoAdvance,
    } = req.body;

    if (!deviceId || !firmwareId) {
      return res.status(400).json({
        success: false,
        error: "deviceId and firmwareId are required for verification.",
      });
    }

    statsTracker.totalVerifications++;

    const result = await verifyFirmware({
      fileBuffer,
      firmwareId,
      deviceId,
      signatureHex: signatureHex || "",
      executeOnChain: executeOnChain === "true" || executeOnChain === true,
      autoAdvance: autoAdvance === "true" || autoAdvance === true,
    });

    // Update telemetry stats based on outcome
    if (result.overallStatus === "DOWNGRADE ATTACK DETECTED") {
      statsTracker.rejectedDowngradeAttacks++;
    } else if (result.overallStatus === "HASH MISMATCH") {
      statsTracker.hashMismatches++;
    } else if (result.overallStatus === "INVALID SIGNATURE") {
      statsTracker.invalidSignatures++;
    } else if (result.overallStatus === "FIRMWARE REVOKED") {
      statsTracker.revokedRejections++;
    } else if (result.overallStatus === "APPROVED" || result.overallStatus === "VERIFIED") {
      statsTracker.successfulAuthorizations++;
    }

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct on-chain authorize call
router.post("/authorize", async (req, res) => {
  try {
    const { deviceId, firmwareId, sha256, autoAdvance } = req.body;
    if (!deviceId || !firmwareId || !sha256) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: deviceId, firmwareId, sha256",
      });
    }

    const result = await blockchain.authorizeUpdate(
      deviceId,
      firmwareId,
      sha256,
      autoAdvance !== false
    );
    statsTracker.successfulAuthorizations++;
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// AUDIT LOG & EVENTS
// -----------------------------------------------------------------------------
router.get("/events", async (req, res) => {
  try {
    const events = await blockchain.getRecentEvents(50);
    res.json({ success: true, count: events.length, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/stats", (req, res) => {
  res.json({ success: true, stats: statsTracker });
});

// -----------------------------------------------------------------------------
// DEMO & ATTACK SIMULATION API
// -----------------------------------------------------------------------------
router.get("/demo/samples", (req, res) => {
  try {
    const sampleDir = config.sampleFirmwareDir;
    if (!fs.existsSync(sampleDir)) {
      return res.json({ success: true, samples: [] });
    }

    const files = fs.readdirSync(sampleDir);
    const manifests = [];

    for (const f of files) {
      if (f.startsWith("manifest_") && f.endsWith(".json")) {
        const content = JSON.parse(fs.readFileSync(path.join(sampleDir, f), "utf8"));
        manifests.push(content);
      }
    }

    res.json({ success: true, samples: manifests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seed blockchain with demo devices and firmware releases
router.post("/demo/seed", async (req, res) => {
  try {
    const isConnected = await blockchain.isBlockchainConnected();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: "Blockchain node not connected. Please run 'npm run node' first.",
      });
    }

    const deviceModel = "ESP32-GridMeter-Pro";
    const deviceId = "SMART-METER-001";
    const initialMinVersion = 200; // Baseline at v2.0.0

    // 1. Register device if not existing
    let deviceRegistered = false;
    try {
      await blockchain.registerDevice(deviceId, deviceModel, initialMinVersion);
      deviceRegistered = true;
    } catch (e) {
      // Device might already exist
    }

    // 2. Load generated sample manifests
    const sampleDir = config.sampleFirmwareDir;
    const v1Manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_v1.0.0.json"), "utf8"));
    const v2Manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_v2.0.0.json"), "utf8"));
    const v3Manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_v3.0.0.json"), "utf8"));

    // Register v1, v2, v3
    const registered = [];
    for (const m of [v1Manifest, v2Manifest, v3Manifest]) {
      try {
        const reg = await blockchain.registerFirmware(
          m.version,
          m.versionCode,
          m.sha256,
          m.deviceModel,
          `ipfs://metadata_${m.version}`
        );
        // Approve v1, v2, v3
        if (reg.firmwareId) {
          await blockchain.approveFirmware(reg.firmwareId);
          registered.push({ version: m.version, firmwareId: reg.firmwareId, approved: true });
        }
      } catch (err) {
        // If already registered, find its firmwareId
      }
    }

    res.json({
      success: true,
      message: "Demo environment seeded successfully on local blockchain.",
      deviceId,
      deviceModel,
      initialMinVersion,
      firmwares: registered,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run attack simulation scenarios 1 through 8
router.post("/demo/run-scenario", async (req, res) => {
  try {
    const { scenarioId } = req.body;
    const sampleDir = config.sampleFirmwareDir;
    const deviceId = "SMART-METER-001";

    // Ensure sample files exist
    const v1Manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_v1.0.0.json"), "utf8"));
    const v2Manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_v2.0.0.json"), "utf8"));
    const v3Manifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_v3.0.0.json"), "utf8"));
    const tamperedManifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_tampered.json"), "utf8"));
    const untrustedManifest = JSON.parse(fs.readFileSync(path.join(sampleDir, "manifest_untrusted_sig.json"), "utf8"));

    // Find registered firmwares on-chain
    const allFws = await blockchain.getAllFirmwares();
    const findFwByVersion = (vCode) => allFws.find((f) => f.versionCode === vCode);

    const fwV1 = findFwByVersion(100);
    const fwV2 = findFwByVersion(200);
    const fwV3 = findFwByVersion(300);

    let output = null;

    switch (Number(scenarioId)) {
      case 1: {
        // SCENARIO 1: VALID FIRMWARE (v2 against minVersion 200) -> ACCEPTED
        if (!fwV2) throw new Error("Firmware v2.0.0 is not registered. Seed the environment first.");
        const buffer = fs.readFileSync(path.join(sampleDir, v2Manifest.filename));
        output = await verifyFirmware({
          fileBuffer: buffer,
          firmwareId: fwV2.firmwareId,
          deviceId: deviceId,
          signatureHex: v2Manifest.signature,
          executeOnChain: true,
          autoAdvance: false,
        });
        break;
      }

      case 2: {
        // SCENARIO 2: DOWNGRADE ATTACK (v1 correctly signed against minVersion 200) -> REJECTED
        if (!fwV1) throw new Error("Firmware v1.0.0 is not registered. Seed the environment first.");
        const buffer = fs.readFileSync(path.join(sampleDir, v1Manifest.filename));
        output = await verifyFirmware({
          fileBuffer: buffer,
          firmwareId: fwV1.firmwareId,
          deviceId: deviceId,
          signatureHex: v1Manifest.signature,
          executeOnChain: false,
        });
        statsTracker.rejectedDowngradeAttacks++;
        break;
      }

      case 3: {
        // SCENARIO 3: FIRMWARE TAMPERING (1 byte modified) -> HASH MISMATCH
        if (!fwV2) throw new Error("Firmware v2.0.0 is not registered.");
        const buffer = fs.readFileSync(path.join(sampleDir, tamperedManifest.filename));
        output = await verifyFirmware({
          fileBuffer: buffer,
          firmwareId: fwV2.firmwareId,
          deviceId: deviceId,
          signatureHex: tamperedManifest.signature,
          executeOnChain: false,
        });
        statsTracker.hashMismatches++;
        break;
      }

      case 4: {
        // SCENARIO 4: INVALID SIGNATURE (signed with untrusted key) -> INVALID SIGNATURE
        if (!fwV2) throw new Error("Firmware v2.0.0 is not registered.");
        const buffer = fs.readFileSync(path.join(sampleDir, v2Manifest.filename));
        output = await verifyFirmware({
          fileBuffer: buffer,
          firmwareId: fwV2.firmwareId,
          deviceId: deviceId,
          signatureHex: untrustedManifest.signature,
          executeOnChain: false,
        });
        statsTracker.invalidSignatures++;
        break;
      }

      case 5: {
        // SCENARIO 5: UNAUTHORIZED APPROVAL (attacker tries to approve) -> REVERT
        try {
          await blockchain.approveFirmware(fwV2.firmwareId, "attacker");
          output = {
            overallStatus: "UNAUTHORIZED_ALLOWED_ERROR",
            passed: false,
            rejectionReason: "Security failure: Attacker was able to approve firmware!",
          };
        } catch (contractError) {
          output = {
            overallStatus: "UNAUTHORIZED ACCESS PREVENTED",
            passed: false,
            checks: [
              {
                name: "Role Check: SECURITY_AUDITOR_ROLE",
                passed: false,
                status: "REVERTED",
                details: `Transaction reverted with AccessControl error: ${contractError.message.slice(0, 150)}...`,
              },
            ],
            rejectionReason: "Unauthorized account attempted approval: Transaction reverted by smart contract access control.",
          };
        }
        break;
      }

      case 6: {
        // SCENARIO 6: VALID UPGRADE (v3 approved, advances minVersion to 300) -> ACCEPTED
        if (!fwV3) throw new Error("Firmware v3.0.0 is not registered.");
        const buffer = fs.readFileSync(path.join(sampleDir, v3Manifest.filename));
        output = await verifyFirmware({
          fileBuffer: buffer,
          firmwareId: fwV3.firmwareId,
          deviceId: deviceId,
          signatureHex: v3Manifest.signature,
          executeOnChain: true,
          autoAdvance: true,
        });
        statsTracker.successfulAuthorizations++;
        break;
      }

      case 7: {
        // SCENARIO 7: ROLLBACK ATTEMPT (Attempt to lower minVersion to 200 after it reached 300) -> REJECTED
        try {
          await blockchain.advanceDeviceMinVersion(deviceId, 200);
          output = {
            overallStatus: "ROLLBACK_ALLOWED_ERROR",
            passed: false,
            rejectionReason: "Security failure: Rollback was permitted!",
          };
        } catch (rollbackError) {
          output = {
            overallStatus: "ROLLBACK PREVENTED",
            passed: false,
            checks: [
              {
                name: "Monotonic Version Increase Enforcement",
                passed: false,
                status: "REVERTED",
                details: `Smart contract strictly rejected version decrease: ${rollbackError.message.slice(0, 150)}...`,
              },
            ],
            rejectionReason: "Rollback attempt blocked: Cannot lower device minimum accepted version. Strictly monotonic.",
          };
        }
        break;
      }

      case 8: {
        // SCENARIO 8: REVOKED FIRMWARE (revoke v2, then attempt verification) -> REJECTED
        if (!fwV2) throw new Error("Firmware v2.0.0 is not registered.");
        // Auditor revokes v2
        await blockchain.revokeFirmware(
          fwV2.firmwareId,
          "CVE-2026-9991: Zero-day remote code execution flaw in TLS handshake"
        );

        const buffer = fs.readFileSync(path.join(sampleDir, v2Manifest.filename));
        output = await verifyFirmware({
          fileBuffer: buffer,
          firmwareId: fwV2.firmwareId,
          deviceId: deviceId,
          signatureHex: v2Manifest.signature,
          executeOnChain: false,
        });
        statsTracker.revokedRejections++;
        break;
      }

      default:
        return res.status(400).json({ success: false, error: `Invalid scenarioId: ${scenarioId}` });
    }

    res.json({ success: true, scenarioId, ...output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
