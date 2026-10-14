const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FirmwareRegistry - Smart Contract Security Tests", function () {
  let firmwareRegistry;
  let admin, publisher, auditor, operator, attacker;

  const DEVICE_ID_1 = "SMART-METER-001";
  const DEVICE_MODEL = "ESP32-GridMeter-Pro";
  const INITIAL_MIN_VERSION = 100; // Represents v1.0.0

  // Sample firmware parameters
  const FW_V1 = {
    versionString: "1.0.0",
    versionCode: 100,
    sha256Hash: ethers.keccak256(ethers.toUtf8Bytes("binary_v1.0.0_content")),
    deviceModel: DEVICE_MODEL,
    metadataUri: "ipfs://QmFirmwareV1Metadata"
  };

  const FW_V2 = {
    versionString: "2.0.0",
    versionCode: 200,
    sha256Hash: ethers.keccak256(ethers.toUtf8Bytes("binary_v2.0.0_content")),
    deviceModel: DEVICE_MODEL,
    metadataUri: "ipfs://QmFirmwareV2Metadata"
  };

  const FW_V3 = {
    versionString: "3.0.0",
    versionCode: 300,
    sha256Hash: ethers.keccak256(ethers.toUtf8Bytes("binary_v3.0.0_content")),
    deviceModel: DEVICE_MODEL,
    metadataUri: "ipfs://QmFirmwareV3Metadata"
  };

  let fwV1Id, fwV2Id, fwV3Id;

  beforeEach(async function () {
    [admin, publisher, auditor, operator, attacker] = await ethers.getSigners();

    const FirmwareRegistryFactory = await ethers.getContractFactory("FirmwareRegistry");
    firmwareRegistry = await FirmwareRegistryFactory.deploy(admin.address);
    await firmwareRegistry.waitForDeployment();

    // Grant granular roles
    const PUBLISHER_ROLE = await firmwareRegistry.FIRMWARE_PUBLISHER_ROLE();
    const AUDITOR_ROLE = await firmwareRegistry.SECURITY_AUDITOR_ROLE();
    const OPERATOR_ROLE = await firmwareRegistry.DEVICE_OPERATOR_ROLE();

    await firmwareRegistry.connect(admin).grantRole(PUBLISHER_ROLE, publisher.address);
    await firmwareRegistry.connect(admin).grantRole(AUDITOR_ROLE, auditor.address);
    await firmwareRegistry.connect(admin).grantRole(OPERATOR_ROLE, operator.address);

    // Register a test device by operator
    await firmwareRegistry.connect(operator).registerDevice(
      DEVICE_ID_1,
      DEVICE_MODEL,
      INITIAL_MIN_VERSION
    );

    // Register v1, v2, v3 by publisher
    const tx1 = await firmwareRegistry.connect(publisher).registerFirmware(
      FW_V1.versionString,
      FW_V1.versionCode,
      FW_V1.sha256Hash,
      FW_V1.deviceModel,
      FW_V1.metadataUri
    );
    const receipt1 = await tx1.wait();
    fwV1Id = receipt1.logs[0].args[0];

    const tx2 = await firmwareRegistry.connect(publisher).registerFirmware(
      FW_V2.versionString,
      FW_V2.versionCode,
      FW_V2.sha256Hash,
      FW_V2.deviceModel,
      FW_V2.metadataUri
    );
    const receipt2 = await tx2.wait();
    fwV2Id = receipt2.logs[0].args[0];

    const tx3 = await firmwareRegistry.connect(publisher).registerFirmware(
      FW_V3.versionString,
      FW_V3.versionCode,
      FW_V3.sha256Hash,
      FW_V3.deviceModel,
      FW_V3.metadataUri
    );
    const receipt3 = await tx3.wait();
    fwV3Id = receipt3.logs[0].args[0];

    // Auditor approves v1, v2, and v3
    await firmwareRegistry.connect(auditor).approveFirmware(fwV1Id);
    await firmwareRegistry.connect(auditor).approveFirmware(fwV2Id);
    await firmwareRegistry.connect(auditor).approveFirmware(fwV3Id);
  });

  describe("Access Control & Role Separation", function () {
    it("should prevent unauthorized accounts from registering devices", async function () {
      await expect(
        firmwareRegistry.connect(attacker).registerDevice("ROGUE-DEV", DEVICE_MODEL, 100)
      ).to.be.revertedWithCustomError(firmwareRegistry, "AccessControlUnauthorizedAccount");
    });

    it("should prevent unauthorized accounts from registering firmware", async function () {
      await expect(
        firmwareRegistry.connect(attacker).registerFirmware(
          "9.9.9",
          999,
          ethers.keccak256(ethers.toUtf8Bytes("malicious")),
          DEVICE_MODEL,
          ""
        )
      ).to.be.revertedWithCustomError(firmwareRegistry, "AccessControlUnauthorizedAccount");
    });

    it("should prevent publisher from unilaterally approving their own firmware without auditor", async function () {
      // Publisher registers a new v4 firmware
      const tx = await firmwareRegistry.connect(publisher).registerFirmware(
        "4.0.0",
        400,
        ethers.keccak256(ethers.toUtf8Bytes("binary_v4")),
        DEVICE_MODEL,
        ""
      );
      const receipt = await tx.wait();
      const fwV4Id = receipt.logs[0].args[0];

      // Publisher tries to approve it themselves
      await expect(
        firmwareRegistry.connect(publisher).approveFirmware(fwV4Id)
      ).to.be.revertedWithCustomError(firmwareRegistry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Device Registration and Version Monotonicity", function () {
    it("should register device correctly with initial minimum version", async function () {
      const dev = await firmwareRegistry.getDevice(DEVICE_ID_1);
      expect(dev.deviceId).to.equal(DEVICE_ID_1);
      expect(dev.deviceModel).to.equal(DEVICE_MODEL);
      expect(dev.minAcceptedVersion).to.equal(INITIAL_MIN_VERSION);
      expect(dev.isActive).to.be.true;
    });

    it("should prevent duplicate device registration", async function () {
      await expect(
        firmwareRegistry.connect(operator).registerDevice(DEVICE_ID_1, DEVICE_MODEL, 100)
      ).to.be.revertedWithCustomError(firmwareRegistry, "DeviceAlreadyExists");
    });

    it("should advance device minimum version when new version is higher", async function () {
      await expect(
        firmwareRegistry.connect(operator).advanceDeviceMinVersion(DEVICE_ID_1, 200)
      ).to.emit(firmwareRegistry, "DeviceMinVersionUpdated")
       .withArgs(DEVICE_ID_1, 100, 200, (val) => val > 0);

      const dev = await firmwareRegistry.getDevice(DEVICE_ID_1);
      expect(dev.minAcceptedVersion).to.equal(200);
    });

    it("should REJECT rollback attempt when trying to lower minimum accepted version", async function () {
      // Advance to 200 first
      await firmwareRegistry.connect(operator).advanceDeviceMinVersion(DEVICE_ID_1, 200);

      // Attempt to lower it back to 100 (Downgrade rollback exploit)
      await expect(
        firmwareRegistry.connect(operator).advanceDeviceMinVersion(DEVICE_ID_1, 100)
      ).to.be.revertedWithCustomError(firmwareRegistry, "InvalidVersionRollback")
       .withArgs(200, 100);

      // Attempt to set to exact same version (must be strictly higher)
      await expect(
        firmwareRegistry.connect(operator).advanceDeviceMinVersion(DEVICE_ID_1, 200)
      ).to.be.revertedWithCustomError(firmwareRegistry, "InvalidVersionRollback")
       .withArgs(200, 200);
    });
  });

  describe("Firmware Verification & Authorization Logic", function () {
    it("should ACCEPT valid firmware update when version meets minimum accepted version", async function () {
      // Device min is 100; V2 is 200
      const [allowed, statusCode, reason] = await firmwareRegistry.verifyUpdatePolicy(
        DEVICE_ID_1,
        fwV2Id,
        FW_V2.sha256Hash
      );
      expect(allowed).to.be.true;
      expect(statusCode).to.equal(0);
      expect(reason).to.contain("passed");

      // Execute on-chain authorization with auto-advance enabled
      await expect(
        firmwareRegistry.connect(operator).authorizeUpdate(
          DEVICE_ID_1,
          fwV2Id,
          FW_V2.sha256Hash,
          true
        )
      ).to.emit(firmwareRegistry, "UpdateAuthorized")
       .withArgs(DEVICE_ID_1, fwV2Id, 200, operator.address, (val) => val > 0);

      // Verify that device min version is now 200
      const dev = await firmwareRegistry.getDevice(DEVICE_ID_1);
      expect(dev.minAcceptedVersion).to.equal(200);
    });

    it("should REJECT Downgrade Attack: older firmware version below device minimum", async function () {
      // First advance device minimum version to 200
      await firmwareRegistry.connect(operator).advanceDeviceMinVersion(DEVICE_ID_1, 200);

      // Attacker attempts to install legitimately signed V1 (version 100)
      const [allowed, statusCode, reason] = await firmwareRegistry.verifyUpdatePolicy(
        DEVICE_ID_1,
        fwV1Id,
        FW_V1.sha256Hash
      );
      expect(allowed).to.be.false;
      expect(statusCode).to.equal(8);
      expect(reason).to.contain("DOWNGRADE ATTACK");

      // Attempting on-chain authorization must revert with DowngradeAttackDetected
      await expect(
        firmwareRegistry.connect(operator).authorizeUpdate(
          DEVICE_ID_1,
          fwV1Id,
          FW_V1.sha256Hash,
          false
        )
      ).to.be.revertedWithCustomError(firmwareRegistry, "DowngradeAttackDetected")
       .withArgs(200, 100);
    });

    it("should REJECT Tampered Firmware: SHA-256 hash mismatch", async function () {
      const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes("corrupted_or_injected_byte"));

      const [allowed, statusCode, reason] = await firmwareRegistry.verifyUpdatePolicy(
        DEVICE_ID_1,
        fwV2Id,
        tamperedHash
      );
      expect(allowed).to.be.false;
      expect(statusCode).to.equal(5);
      expect(reason).to.contain("SHA-256 hash does not match");

      await expect(
        firmwareRegistry.connect(operator).authorizeUpdate(
          DEVICE_ID_1,
          fwV2Id,
          tamperedHash,
          false
        )
      ).to.be.revertedWithCustomError(firmwareRegistry, "HashMismatch");
    });

    it("should REJECT Revoked Firmware even if version and hash are valid", async function () {
      // Auditor revokes V2 due to a critical zero-day
      await firmwareRegistry.connect(auditor).revokeFirmware(
        fwV2Id,
        "CVE-2026-8812: Remote code execution in network stack"
      );

      const [allowed, statusCode, reason] = await firmwareRegistry.verifyUpdatePolicy(
        DEVICE_ID_1,
        fwV2Id,
        FW_V2.sha256Hash
      );
      expect(allowed).to.be.false;
      expect(statusCode).to.equal(6);
      expect(reason).to.contain("revoked");

      await expect(
        firmwareRegistry.connect(operator).authorizeUpdate(
          DEVICE_ID_1,
          fwV2Id,
          FW_V2.sha256Hash,
          false
        )
      ).to.be.revertedWithCustomError(firmwareRegistry, "FirmwareAlreadyRevoked");
    });

    it("should REJECT Unapproved Firmware", async function () {
      // Publisher registers v4 without approval
      const tx = await firmwareRegistry.connect(publisher).registerFirmware(
        "4.0.0",
        400,
        ethers.keccak256(ethers.toUtf8Bytes("binary_v4")),
        DEVICE_MODEL,
        ""
      );
      const receipt = await tx.wait();
      const fwV4Id = receipt.logs[0].args[0];

      const [allowed, statusCode, reason] = await firmwareRegistry.verifyUpdatePolicy(
        DEVICE_ID_1,
        fwV4Id,
        ethers.keccak256(ethers.toUtf8Bytes("binary_v4"))
      );
      expect(allowed).to.be.false;
      expect(statusCode).to.equal(7);
      expect(reason).to.contain("auditor approval");
    });

    it("should REJECT Incompatible Device Model", async function () {
      // Register device with different model
      const DIFFERENT_DEVICE = "THERMOSTAT-009";
      await firmwareRegistry.connect(operator).registerDevice(
        DIFFERENT_DEVICE,
        "Nest-Thermostat-Gen3",
        100
      );

      const [allowed, statusCode, reason] = await firmwareRegistry.verifyUpdatePolicy(
        DIFFERENT_DEVICE,
        fwV2Id,
        FW_V2.sha256Hash
      );
      expect(allowed).to.be.false;
      expect(statusCode).to.equal(4);
      expect(reason).to.contain("incompatible");
    });
  });
});
