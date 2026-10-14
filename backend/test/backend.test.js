const { expect } = require("chai");
const request = require("supertest");
const cryptoUtils = require("../src/cryptoUtils");
const app = require("../src/server");

describe("ChainGuard Backend & Cryptography Unit Tests", function () {
  const sampleData = Buffer.from("SECURE_IOT_FIRMWARE_BINARY_PAYLOAD_TEST_12345");

  describe("Cryptographic Module (SHA-256 & Ed25519)", function () {
    it("should compute accurate SHA-256 hash of a binary buffer", function () {
      const hash1 = cryptoUtils.calculateSha256(sampleData);
      const hash2 = cryptoUtils.calculateSha256(sampleData);
      expect(hash1).to.be.a("string");
      expect(hash1).to.have.lengthOf(64);
      expect(hash1).to.equal(hash2);
    });

    it("should sign binary payload with trusted vendor private key and verify with public key", function () {
      const privKey = cryptoUtils.getTrustedPrivateKey();
      const pubKey = cryptoUtils.getTrustedPublicKey();

      const signatureHex = cryptoUtils.signBuffer(sampleData, privKey);
      expect(signatureHex).to.be.a("string");

      const isValid = cryptoUtils.verifyEd25519Signature(sampleData, signatureHex, pubKey);
      expect(isValid).to.be.true;
    });

    it("should reject tampered data against legitimate signature", function () {
      const privKey = cryptoUtils.getTrustedPrivateKey();
      const pubKey = cryptoUtils.getTrustedPublicKey();

      const signatureHex = cryptoUtils.signBuffer(sampleData, privKey);

      // Modify one byte of payload
      const tampered = Buffer.from(sampleData);
      tampered[0] = tampered[0] ^ 0xff;

      const isValid = cryptoUtils.verifyEd25519Signature(tampered, signatureHex, pubKey);
      expect(isValid).to.be.false;
    });

    it("should detect signature generated with untrusted attacker key", function () {
      const attackerPrivKey = cryptoUtils.getAttackerPrivateKey();
      const trustedPubKey = cryptoUtils.getTrustedPublicKey();

      // Attacker signs payload with their own rogue private key
      const rogueSignature = cryptoUtils.signBuffer(sampleData, attackerPrivKey);

      // System verifies against the manufacturer's trusted public key
      const isValid = cryptoUtils.verifyEd25519Signature(sampleData, rogueSignature, trustedPubKey);
      expect(isValid).to.be.false;
    });
  });

  describe("Backend API Endpoints", function () {
    it("GET / should return service info and endpoint list", async function () {
      const res = await request(app).get("/");
      expect(res.status).to.equal(200);
      expect(res.body.project).to.contain("ChainGuard");
      expect(res.body.endpoints).to.be.an("array");
    });

    it("GET /api/status should return system status and telemetry", async function () {
      const res = await request(app).get("/api/status");
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("online");
      expect(res.body.stats).to.be.an("object");
    });

    it("GET /api/demo/samples should return list of sample firmware manifests", async function () {
      const res = await request(app).get("/api/demo/samples");
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.samples).to.be.an("array");
      expect(res.body.samples.length).to.be.at.least(3);
    });

    it("POST /api/verify should reject request when required parameters are missing", async function () {
      const res = await request(app)
        .post("/api/verify")
        .send({});
      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.be.a("string");
    });
  });
});
