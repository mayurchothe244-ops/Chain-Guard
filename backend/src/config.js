const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Search for .env in current folder, parent folder, etc.
const rootEnvPath = path.resolve(__dirname, "..", "..", ".env");
const localEnvPath = path.resolve(__dirname, "..", ".env");

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const config = {
  port: process.env.PORT || 5000,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  deployerPrivateKey:
    process.env.DEPLOYER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  publisherPrivateKey:
    process.env.PUBLISHER_PRIVATE_KEY ||
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  auditorPrivateKey:
    process.env.AUDITOR_PRIVATE_KEY ||
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  deployedAddressPath:
    process.env.DEPLOYED_ADDRESS_PATH ||
    path.resolve(__dirname, "..", "..", "deployed-address.json"),
  keysDir: path.resolve(__dirname, "..", "test-keys"),
  sampleFirmwareDir: path.resolve(__dirname, "..", "sample-firmware"),
  artifactsDir: path.resolve(
    __dirname,
    "..",
    "..",
    "artifacts",
    "contracts",
    "FirmwareRegistry.sol"
  ),
};

module.exports = config;
