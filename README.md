# ChainGuard — Blockchain-Based IoT Firmware Downgrade Protection System

**BLOCKHACK 2026 Submission**  
**Problem Statement:** PS-06: THE DOWNGRADE ATTACK — Lightweight Trust for Critical IoT Firmware  
**Project Name:** ChainGuard  

---

## 1. Executive Summary & Problem Solved

Critical IoT infrastructure (smart electrical grid meters, medical infusion pumps, connected industrial sensors, automotive ECUs) relies on cryptographic digital signatures (such as Ed25519 or RSA) to verify that firmware updates originate from an authentic manufacturer.

### The Fatal Vulnerability: The Downgrade Attack
**A valid digital signature alone does NOT prevent downgrade attacks.**

Consider the following threat sequence:
1. **Manufacturer releases Firmware v1.0:** The binary is legitimately signed by the vendor's private key. Later, a severe remote code execution vulnerability (e.g. CVE-2025-9999 in the TCP/IP stack) is identified.
2. **Manufacturer releases Firmware v2.0:** The vulnerability is patched.
3. **The Attacker Strikes:** An attacker captures the legitimately signed Firmware v1.0 binary and broadcasts it over the OTA (Over-The-Air) update channel to field devices.
4. **The Flaw:** If the device only checks the digital signature and hash, Firmware v1.0 **passes all cryptographic checks**! The device downgrades to v1.0, re-exposing the patched vulnerability for the attacker to exploit.

### ChainGuard Solution
ChainGuard pairs cryptographic digital signatures (Ed25519) and SHA-256 binary hashing with an **immutable Solidity smart contract consensus engine**:
* **Monotonically Increasing Version Mark:** Each device fleet maintains an immutable low-water mark (`minAcceptedVersion`). Rollback attempts revert at the EVM bytecode level (`require(newVersion > currentMinVersion)`).
* **Multi-Party Trust & Role Separation:** Firmware Publishers cannot unilaterally self-approve firmware without an independent Security Auditor's on-chain sign-off.
* **Instant Network-Wide Revocation:** When zero-days are identified, auditors revoke firmware on-chain, immediately neutralizing compromised builds fleet-wide.
* **Immutable Audit Trail:** All verification attempts, authorizations, and downgrade blocks are permanently recorded as on-chain events.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    CHAINGUARD ECOSYSTEM                                 |
+-----------------------------------------------------------------------------------------+

  [ 1. FIRMWARE VENDOR ]
         |
         |-- Builds firmware binary (v1.0.0, v2.0.0, v3.0.0)
         |-- Signs binary with Ed25519 Manufacturer Private Key
         |-- Registers metadata (Version String, Integer Version Code, SHA-256) on-chain
         v
  [ 2. SMART CONTRACT: FirmwareRegistry.sol ] <---+ [ 3. SECURITY AUDITOR ]
         |                                        |      |
         |-- AccessControl (Publisher, Auditor)   |      |-- Audits CVE disclosures
         |-- Enforces strict monotonic minVersion |      +-- Executes on-chain approval/revocation
         |-- Emits on-chain audit trail events    |
         v                                        |
  [ 4. CHAINGUARD BACKEND GATEWAY (Node.js/Express) ]
         |
         |-- Receives firmware binary upload + Ed25519 signature
         |-- Evaluates Multi-Layer Verification Pipeline:
         |     Check 1: SHA-256 Hash Integrity vs. Ledger
         |     Check 2: Ed25519 Digital Signature Authenticity
         |     Check 3: Device Registration & Status
         |     Check 4: Device Hardware Model Compatibility
         |     Check 5: Auditor Approval & Revocation Status
         |     Check 6: Monotonic Anti-Downgrade Version Policy (EVM Guard)
         v
  [ 5. FIELD IOT HARDWARE / SIMULATED RECEIVER ]
         |
         |-- Flashes partition only if on-chain authorization receipt is verified
         +-- Internal OTP eFuse / non-volatile counter advances to new low-water mark
```

---

## 3. Technology Stack

* **Smart Contract / Blockchain:** Solidity `0.8.24`, OpenZeppelin Contracts `v5.0.2`, Hardhat `2.22.5`
* **Blockchain Interaction:** `ethers.js v6.13.0`
* **Backend Gateway:** Node.js `24.x`, Express `4.19`, Multer `1.4.5`, Dotenv `16.4`
* **Cryptography:**
  * **Hashing:** SHA-256 (64-byte hex digest)
  * **Signatures:** Ed25519 digital signatures using Node.js native cryptographic subsystem (`crypto.sign` and `crypto.verify` via OpenSSL)
* **Frontend:** React `18.3`, Vite `5.2`, Lucide Icons (`lucide-react`)
* **Styling:** Custom responsive CSS with dark-mode cybersecurity theme, glowing status badges, and simulated OLED hardware display.

---

## 4. Beginner-Friendly Zero-to-One Setup Guide

Follow these exact commands step-by-step. Everything runs locally without external cloud dependencies or paid APIs.

### Prerequisites
* **Node.js:** v18, v20, v22, or v24 installed ([Download Node.js](https://nodejs.org/)).
* Verify installation in terminal:
  ```powershell
  node -v
  npm -v
  ```

---

### Step 1: Install Dependencies
Open **Terminal 1** in the project root directory:

**Windows PowerShell:**
```powershell
# 1. Install root dependencies (Hardhat, ethers, OpenZeppelin)
npm install

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..
```

*(On Linux / macOS, run the identical commands in bash)*

---

### Step 2: Compile Smart Contracts & Run Tests
Verify the Solidity smart contract and backend cryptographic unit tests:

```powershell
# Compile Solidity contracts
npm run compile

# Run Hardhat automated contract security tests (13 passing tests)
npm run test:contract

# Run Backend cryptographic & API tests (8 passing tests)
npm run backend:test
```

---

### Step 3: Generate Cryptographic Demo Keys & Sample Binaries
Run the demo generator to create local development Ed25519 keys, authentic firmware files, tampered binaries, and digital signatures:

```powershell
npm run seed
```

This generates:
* `backend/test-keys/trusted_vendor_private.pem` & `trusted_vendor_public.pem`
* `backend/test-keys/untrusted_attacker_private.pem` & `untrusted_attacker_public.pem`
* `backend/sample-firmware/firmware_v1.0.0.bin` (Vulnerable legacy version, versionCode: 100)
* `backend/sample-firmware/firmware_v2.0.0.bin` (Current approved baseline, versionCode: 200)
* `backend/sample-firmware/firmware_v3.0.0.bin` (Upgrade release, versionCode: 300)
* `backend/sample-firmware/firmware_v2.0.0_tampered.bin` (1 byte flipped for tampering detection)

---

### Step 4: Start the Local Blockchain Node
In **Terminal 1** (leave running):

```powershell
npm run node
```
*Starts local Hardhat RPC node at `http://127.0.0.1:8545` with 20 pre-funded test accounts.*

---

### Step 5: Deploy the Smart Contract & Assign Roles
Open **Terminal 2** in the project root:

```powershell
npm run deploy:local
```
*Deploys `FirmwareRegistry.sol` to localhost, grants `FIRMWARE_PUBLISHER_ROLE` to Account #1, `SECURITY_AUDITOR_ROLE` to Account #2, and saves the contract address to `deployed-address.json`.*

---

### Step 6: Start the Backend Gateway
In **Terminal 2**:

```powershell
npm run backend
```
*Starts the Express Gateway on `http://localhost:5000` connected to the local blockchain RPC.*

---

### Step 7: Start the React Frontend Dashboard
Open **Terminal 3** in the project root:

```powershell
npm run frontend
```
*Starts the Vite dev server on `http://localhost:5173` with an automatic proxy to the backend API.*

Open **http://localhost:5173** in your web browser.

---

## 5. Live Attack Demonstration (8 Scenarios)

Navigate to the **Attack Simulator** tab in the dashboard. Click **"Prepare Demo Environment"** to initialize the baseline device (`SMART-METER-001`, minVersion: 200) and register the sample releases.

### Scenario 1 — Valid Firmware Update
* **Action:** Submit authentic Firmware v2.0.0 (versionCode: 200) signed with the Trusted Vendor key.
* **Verification:** Hash matches on-chain record; Ed25519 signature is verified; version 200 meets device minimum 200.
* **Outcome:** `APPROVED FOR INSTALLATION` (Confirmed with real on-chain transaction receipt).

### Scenario 2 — The Downgrade Attack
* **Action:** Attacker captures legitimately vendor-signed Firmware v1.0.0 (versionCode: 100) and attempts an OTA push.
* **Verification:** Signature is **VALID**, hash is **VALID**, but version 100 < device minimum 200.
* **Outcome:** `REJECTED — DOWNGRADE ATTACK DETECTED`. Device OLED screen blocks flash write.

### Scenario 3 — Firmware Binary Tampering
* **Action:** Attacker injects 1 byte into an approved binary (offset 64).
* **Verification:** Computed SHA-256 hash does not match immutable ledger hash.
* **Outcome:** `REJECTED — HASH MISMATCH`.

### Scenario 4 — Rogue / Untrusted Signature
* **Action:** Binary signed with an unauthorized developer key instead of Trusted Vendor root.
* **Verification:** Ed25519 public key pinning check fails.
* **Outcome:** `REJECTED — INVALID SIGNATURE`.

### Scenario 5 — Unauthorized Auditor Approval
* **Action:** Unauthorized account calls `approveFirmware()` without `SECURITY_AUDITOR_ROLE`.
* **Verification:** OpenZeppelin AccessControl enforces role restriction.
* **Outcome:** `UNAUTHORIZED ACCESS PREVENTED` (Transaction reverts on-chain).

### Scenario 6 — Valid Upgrade Release
* **Action:** Auditor approves Firmware v3.0.0 (versionCode: 300). System executes update with auto-advance enabled.
* **Verification:** All checks pass; device minimum version increases from 200 to 300.
* **Outcome:** `APPROVED — MIN VERSION ADVANCED TO 300`.

### Scenario 7 — Minimum Version Rollback Attempt
* **Action:** After device advances to 300, rogue operator attempts to call `advanceDeviceMinVersion(200)`.
* **Verification:** Solidity smart contract strictly evaluates `require(newMinVersion > dev.minAcceptedVersion)`.
* **Outcome:** `ROLLBACK PREVENTED` (Reverts with `InvalidVersionRollback(300, 200)`).

### Scenario 8 — Revoked Firmware Defense
* **Action:** Auditor discovers zero-day CVE-2026-9991 in v2.0.0 and executes on-chain revocation. Attacker attempts installation.
* **Verification:** Contract verifies `firmware.isRevoked == false`.
* **Outcome:** `REJECTED — FIRMWARE REVOKED`.

---

## 6. REST API Documentation

Base URL: `http://localhost:5000/api`

| Endpoint | Method | Description |
|---|---|---|
| `/status` | `GET` | Returns blockchain connection, active contract address, network info, and telemetry counters. |
| `/devices` | `GET` | Returns list of all registered IoT devices with current minimum accepted versions. |
| `/devices` | `POST` | Registers new device (`{ deviceId, deviceModel, initialMinVersion }`). |
| `/devices/:id/advance-version` | `POST` | Advances device minimum version (`{ newMinVersion }`). Reverts if $\le$ current version. |
| `/firmwares` | `GET` | Returns all registered firmware manifests and approval statuses. |
| `/firmwares/register` | `POST` | Registers firmware metadata (`{ versionString, versionCode, sha256, deviceModel, metadataUri }`). |
| `/firmwares/:id/approve` | `POST` | Auditor approves firmware release for field installation. |
| `/firmwares/:id/revoke` | `POST` | Auditor revokes firmware with reason string. |
| `/verify` | `POST` | Uploads binary (`multipart/form-data`) or selects sample file, running the 6-layer verification engine. |
| `/authorize` | `POST` | Triggers state-changing on-chain authorization transaction. |
| `/events` | `GET` | Queries recent on-chain events (`UpdateAuthorized`, `UpdateRejected`, etc.). |
| `/demo/seed` | `POST` | One-click setup populating demo device and baseline firmware releases. |
| `/demo/run-scenario` | `POST` | Deterministically executes scenarios 1 through 8 (`{ scenarioId: 1..8 }`). |

---

## 7. Security Assumptions & Real-World Limitations

1. **Hardware Security Elements:** Software and blockchain validation must be backed on the physical IoT chip by a Hardware Root of Trust (e.g. ARM TrustZone, Microchip ATECC608, or ESP32 Secure Boot v2) with write-once OTP anti-rollback eFuses.
2. **Microcontroller Connectivity:** Constrained 8-bit or 16-bit microcontrollers do not run full Ethereum JSON-RPC nodes directly. In production, edge gateways or cryptographic Merkle inclusion proofs (EIP-712 typed data) are utilized for zero-overhead client validation.
3. **Off-Chain Binary Storage:** Binaries are stored off-chain (IPFS, Swarm, or secure CDNs). The blockchain acts as an immutable, tamper-proof notary for metadata, authorization, and version enforcement.

---

## 8. Troubleshooting Guide

* **Error: `HH100: Network localhost doesn't exist` or node connection refused:**  
  Make sure `npm run node` is active in Terminal 1 before running deploy, seed, or backend commands.
* **Port 5000 or 5173 already in use:**  
  Change `PORT=5001` in `.env` or run `npx kill-port 5000`.
* **Contract Not Deployed message in Frontend:**  
  Run `npm run deploy:local` in your root terminal. The deployed address will automatically be written to `deployed-address.json`.
* **Resetting Demo Data:**  
  Simply restart `npm run node` and re-run `npm run deploy:local` followed by clicking "Prepare Demo Environment" in the dashboard.
