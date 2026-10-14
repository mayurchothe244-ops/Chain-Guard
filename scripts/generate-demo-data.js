const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * ChainGuard Demo Data & Key Generator
 * Generates local development-only Ed25519 cryptographic keypairs,
 * authentic firmware binaries (v1.0.0, v2.0.0, v3.0.0), tampered binaries,
 * and valid cryptographic signatures.
 */

const BACKEND_DIR = path.join(__dirname, "..", "backend");
const KEYS_DIR = path.join(BACKEND_DIR, "test-keys");
const FIRMWARE_DIR = path.join(BACKEND_DIR, "sample-firmware");

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateKeys() {
  console.log("Generating development-only Ed25519 keypairs...");
  ensureDirectoryExists(KEYS_DIR);

  // 1. Trusted Manufacturer / Vendor Keypair
  const trustedPair = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(path.join(KEYS_DIR, "trusted_vendor_private.pem"), trustedPair.privateKey);
  fs.writeFileSync(path.join(KEYS_DIR, "trusted_vendor_public.pem"), trustedPair.publicKey);

  // 2. Untrusted / Rogue Attacker Keypair (for signature forgery testing)
  const untrustedPair = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(path.join(KEYS_DIR, "untrusted_attacker_private.pem"), untrustedPair.privateKey);
  fs.writeFileSync(path.join(KEYS_DIR, "untrusted_attacker_public.pem"), untrustedPair.publicKey);

  console.log("✓ Saved Ed25519 keys in backend/test-keys/");
  return { trustedPair, untrustedPair };
}

function createFirmwareBinary(filename, headerMagic, version, contentStr) {
  // Create a realistic binary payload: 4KB with a specific header and code section
  const header = Buffer.from(`CHAINGUARD_FW:${headerMagic}:${version}\0`, "utf8");
  const payload = Buffer.from(contentStr.repeat(32), "utf8");
  const padding = Buffer.alloc(Math.max(0, 4096 - header.length - payload.length), 0x5a);
  return Buffer.concat([header, payload, padding]);
}

function calculateSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function signBuffer(buffer, privateKeyPem) {
  return crypto.sign(null, buffer, privateKeyPem).toString("hex");
}

function generateFirmwareAndManifests(keys) {
  console.log("Generating sample firmware binaries and manifests...");
  ensureDirectoryExists(FIRMWARE_DIR);

  const deviceModel = "ESP32-GridMeter-Pro";

  // --- Firmware v1.0.0 (Legacy vulnerable version) ---
  const v1Content = "FIRMWARE_VERSION_1.0.0_LEGACY_CODEBASE_VULNERABLE_TO_CVE_2025_9999;";
  const v1Bin = createFirmwareBinary("firmware_v1.0.0.bin", "ESP32_BL", "1.0.0", v1Content);
  const v1Path = path.join(FIRMWARE_DIR, "firmware_v1.0.0.bin");
  fs.writeFileSync(v1Path, v1Bin);

  const v1Hash = calculateSha256(v1Bin);
  const v1Sig = signBuffer(v1Bin, keys.trustedPair.privateKey);
  const v1Manifest = {
    version: "1.0.0",
    versionCode: 100,
    deviceModel: deviceModel,
    filename: "firmware_v1.0.0.bin",
    fileSize: v1Bin.length,
    sha256: v1Hash,
    sha256Bytes32: "0x" + v1Hash,
    signature: v1Sig,
    signer: "Trusted Vendor (Ed25519)",
    isTrustedSigner: true,
    description: "Legacy firmware v1.0.0 - contains buffer overflow vulnerability (CVE-2025-9999)",
  };
  fs.writeFileSync(path.join(FIRMWARE_DIR, "manifest_v1.0.0.json"), JSON.stringify(v1Manifest, null, 2));

  // --- Firmware v2.0.0 (Current baseline approved version) ---
  const v2Content = "FIRMWARE_VERSION_2.0.0_STABLE_PATCHED_SECURITY_BASELINE_SECURE_AUTH;";
  const v2Bin = createFirmwareBinary("firmware_v2.0.0.bin", "ESP32_BL", "2.0.0", v2Content);
  const v2Path = path.join(FIRMWARE_DIR, "firmware_v2.0.0.bin");
  fs.writeFileSync(v2Path, v2Bin);

  const v2Hash = calculateSha256(v2Bin);
  const v2Sig = signBuffer(v2Bin, keys.trustedPair.privateKey);
  const v2Manifest = {
    version: "2.0.0",
    versionCode: 200,
    deviceModel: deviceModel,
    filename: "firmware_v2.0.0.bin",
    fileSize: v2Bin.length,
    sha256: v2Hash,
    sha256Bytes32: "0x" + v2Hash,
    signature: v2Sig,
    signer: "Trusted Vendor (Ed25519)",
    isTrustedSigner: true,
    description: "Stable baseline firmware v2.0.0 - all security patches applied and approved",
  };
  fs.writeFileSync(path.join(FIRMWARE_DIR, "manifest_v2.0.0.json"), JSON.stringify(v2Manifest, null, 2));

  // --- Firmware v3.0.0 (Upgrade release) ---
  const v3Content = "FIRMWARE_VERSION_3.0.0_ENHANCED_TELEMETRY_QUANTUM_RESISTANT_SUITE;";
  const v3Bin = createFirmwareBinary("firmware_v3.0.0.bin", "ESP32_BL", "3.0.0", v3Content);
  const v3Path = path.join(FIRMWARE_DIR, "firmware_v3.0.0.bin");
  fs.writeFileSync(v3Path, v3Bin);

  const v3Hash = calculateSha256(v3Bin);
  const v3Sig = signBuffer(v3Bin, keys.trustedPair.privateKey);
  const v3Manifest = {
    version: "3.0.0",
    versionCode: 300,
    deviceModel: deviceModel,
    filename: "firmware_v3.0.0.bin",
    fileSize: v3Bin.length,
    sha256: v3Hash,
    sha256Bytes32: "0x" + v3Hash,
    signature: v3Sig,
    signer: "Trusted Vendor (Ed25519)",
    isTrustedSigner: true,
    description: "Next-generation firmware v3.0.0 - performance and feature enhancements",
  };
  fs.writeFileSync(path.join(FIRMWARE_DIR, "manifest_v3.0.0.json"), JSON.stringify(v3Manifest, null, 2));

  // --- Firmware Tampered (v2.0.0 with 1 single byte modified) ---
  const tamperedBin = Buffer.from(v2Bin);
  tamperedBin[64] = tamperedBin[64] ^ 0xff; // Invert one byte
  const tamperedPath = path.join(FIRMWARE_DIR, "firmware_v2.0.0_tampered.bin");
  fs.writeFileSync(tamperedPath, tamperedBin);

  const tamperedHash = calculateSha256(tamperedBin);
  const tamperedManifest = {
    version: "2.0.0",
    versionCode: 200,
    deviceModel: deviceModel,
    filename: "firmware_v2.0.0_tampered.bin",
    fileSize: tamperedBin.length,
    sha256: tamperedHash,
    sha256Bytes32: "0x" + tamperedHash,
    signature: v2Sig, // Claimed signature of original v2
    signer: "Forged / Tampered",
    isTrustedSigner: false,
    description: "Tampered firmware file: 1 single byte altered at offset 64 to test hash detection",
  };
  fs.writeFileSync(path.join(FIRMWARE_DIR, "manifest_tampered.json"), JSON.stringify(tamperedManifest, null, 2));

  // --- Firmware with Untrusted Signature (v2.0.0 signed with rogue key) ---
  const untrustedSig = signBuffer(v2Bin, keys.untrustedPair.privateKey);
  const untrustedManifest = {
    version: "2.0.0",
    versionCode: 200,
    deviceModel: deviceModel,
    filename: "firmware_v2.0.0.bin", // Valid binary
    fileSize: v2Bin.length,
    sha256: v2Hash,
    sha256Bytes32: "0x" + v2Hash,
    signature: untrustedSig, // Signed by attacker private key!
    signer: "Attacker / Untrusted Developer",
    isTrustedSigner: false,
    description: "Valid binary v2.0.0, but signed with an unrecognized rogue private key",
  };
  fs.writeFileSync(path.join(FIRMWARE_DIR, "manifest_untrusted_sig.json"), JSON.stringify(untrustedManifest, null, 2));

  console.log("✓ Sample firmware files created in backend/sample-firmware/");
  console.log("  - firmware_v1.0.0.bin (Legitimate old signed version)");
  console.log("  - firmware_v2.0.0.bin (Approved current baseline)");
  console.log("  - firmware_v3.0.0.bin (Upgrade release)");
  console.log("  - firmware_v2.0.0_tampered.bin (Tampered 1 byte)");
}

function main() {
  console.log("=================================================");
  console.log("ChainGuard: Initializing Cryptographic Demo Data");
  console.log("=================================================");
  const keys = generateKeys();
  generateFirmwareAndManifests(keys);
  console.log("Demo cryptographic data generated successfully.");
}

main();
