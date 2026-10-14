const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const config = require("./config");

/**
 * Cryptographic utility functions for firmware hashing and Ed25519 digital signatures.
 */

function calculateSha256(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("calculateSha256 requires a Buffer input");
  }
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getTrustedPublicKey() {
  const keyPath = path.join(config.keysDir, "trusted_vendor_public.pem");
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Trusted vendor public key not found at: ${keyPath}. Run npm run seed first.`);
  }
  return fs.readFileSync(keyPath, "utf8");
}

function getTrustedPrivateKey() {
  const keyPath = path.join(config.keysDir, "trusted_vendor_private.pem");
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Trusted vendor private key not found at: ${keyPath}. Run npm run seed first.`);
  }
  return fs.readFileSync(keyPath, "utf8");
}

function getAttackerPublicKey() {
  const keyPath = path.join(config.keysDir, "untrusted_attacker_public.pem");
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Untrusted attacker public key not found at: ${keyPath}. Run npm run seed first.`);
  }
  return fs.readFileSync(keyPath, "utf8");
}

function getAttackerPrivateKey() {
  const keyPath = path.join(config.keysDir, "untrusted_attacker_private.pem");
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Untrusted attacker private key not found at: ${keyPath}. Run npm run seed first.`);
  }
  return fs.readFileSync(keyPath, "utf8");
}

/**
 * Verify Ed25519 digital signature of a binary buffer against a public key PEM.
 * @param {Buffer} buffer - Raw firmware bytes
 * @param {string} signatureHex - Signature in hex format
 * @param {string} [publicKeyPem] - Public key PEM (defaults to trusted vendor public key)
 * @returns {boolean}
 */
function verifyEd25519Signature(buffer, signatureHex, publicKeyPem = null) {
  try {
    const key = publicKeyPem || getTrustedPublicKey();
    const sigBuffer = Buffer.from(signatureHex.replace(/^0x/, ""), "hex");
    return crypto.verify(null, buffer, key, sigBuffer);
  } catch (error) {
    console.error("Signature verification error:", error.message);
    return false;
  }
}

/**
 * Sign a buffer with an Ed25519 private key.
 * @param {Buffer} buffer 
 * @param {string} privateKeyPem 
 * @returns {string} Hex-encoded signature
 */
function signBuffer(buffer, privateKeyPem) {
  const sig = crypto.sign(null, buffer, privateKeyPem);
  return sig.toString("hex");
}

module.exports = {
  calculateSha256,
  getTrustedPublicKey,
  getTrustedPrivateKey,
  getAttackerPublicKey,
  getAttackerPrivateKey,
  verifyEd25519Signature,
  signBuffer,
};
