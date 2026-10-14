# ChainGuard — BLOCKHACK 2026 Presentation & Live Demo Guide

**Problem Statement:** PS-06: THE DOWNGRADE ATTACK — Lightweight Trust for Critical IoT Firmware  
**Project Name:** ChainGuard  
**Track:** Blockchain Security & IoT Infrastructure  

---

## 1. 3–5 Minute Judge Live Demonstration Script

### Timing Breakdown
* **[0:00 – 0:30]** The Problem: The Downgrade Attack in 20 Seconds
* **[0:30 – 1:00]** System Architecture: Multi-Party Trust Model
* **[1:00 – 2:00]** Live Execution: Authentic Firmware vs. The Downgrade Attack
* **[2:00 – 2:45]** Live Execution: Tampering & Untrusted Keys
* **[2:45 – 3:30]** Ledger Enforcement: Monotonic Anti-Rollback & Auditor Revocation
* **[3:30 – 4:00]** Hardware Reality, Limitations, & Wrap-Up

---

### Step-by-Step Spoken Script

#### [0:00 – 0:30] The Downgrade Attack Explained
> "Judges, in critical IoT infrastructure—smart energy grids, medical infusion pumps, and automotive telematics—manufacturers sign firmware updates with digital signatures like Ed25519 or RSA.
> 
> Here is the fatal flaw: **A valid digital signature alone does NOT prevent downgrade attacks.**
> 
> If Firmware v1.0 has a known vulnerability (like an unauthenticated buffer overflow) and Firmware v2.0 patches it, an attacker can capture the legitimately signed v1.0 binary and push it back to the device. Because the vendor's signature on v1.0 is mathematically valid, traditional devices happily flash the vulnerable version. The attacker re-opens the security hole and takes over the device.
> 
> **ChainGuard solves this using an immutable blockchain-backed version policy and multi-party trust.**"

#### [0:30 – 1:00] Multi-Party Trust Architecture
*(Point to the Multi-Party Trust diagram on the dashboard Overview screen)*
> "ChainGuard separates roles across three distinct stakeholders:
> 1. **Firmware Publisher (Vendor):** Generates binaries, signs them with Ed25519, and registers SHA-256 metadata on-chain. Crucially, the vendor **cannot self-approve** releases.
> 2. **Independent Security Auditor:** Audits security claims and CVE disclosures, executing on-chain approval or revocation.
> 3. **Smart Contract Consensus Engine:** Immutably enforces a strictly increasing minimum version threshold per device fleet (`minAcceptedVersion`). Rollbacks revert at the EVM bytecode level.
> 4. **IoT Device Bootloader:** Checks the decentralized ledger before allowing partition writes."

#### [1:00 – 2:00] Live Demo: Scenario 1 vs. Scenario 2 (The Core Attack)
*(Navigate to the **Attack Simulator** tab)*
> "Let's demonstrate this live. Our device `SMART-METER-001` currently has a minimum accepted version of **200 (v2.0.0)**.
> 
> First, **Scenario 1**: We upload legitimate Firmware v2.0.0. All 6 security checks run: hash matches, Ed25519 signature is valid, and version 200 meets the device minimum. The result is **APPROVED FOR INSTALLATION**, recording a real on-chain transaction receipt.
> 
> Now, the attack: **Scenario 2**. The attacker captures legitimately signed Firmware v1.0.0 (version 100) and attempts an OTA push.
> 
> Look at the diagnostic output:
> * Ed25519 Signature: **VALID** (Signed by trusted vendor!)
> * SHA-256 Integrity: **MATCH**
> * Device Status: **ACTIVE**
> * Anti-Downgrade Version Policy: **REJECTED — DOWNGRADE ATTACK DETECTED!**
> 
> Notice that even though the cryptographic signature is 100% valid, ChainGuard detects that version 100 is below the device's monotonic minimum version of 200. The simulated field hardware OLED screen immediately locks the flash memory."

#### [2:00 – 2:45] Live Demo: Tampering & Rogue Signatures
> "What if an attacker tries to modify code or forge signatures?
> 
> * **Scenario 3 (Firmware Tampering):** We flip a single byte in an approved binary. Result: **REJECTED — HASH MISMATCH**. The computed SHA-256 does not match the immutable ledger hash.
> * **Scenario 4 (Rogue Signature):** An attacker signs a valid binary with an unauthorized private key. Result: **REJECTED — INVALID SIGNATURE**. The Ed25519 public key pinning check rejects the untrusted key."

#### [2:45 – 3:30] Ledger Enforcement: Anti-Rollback & Auditor Revocation
> "Next, can an attacker or compromised gateway lower the device's minimum version?
> 
> * In **Scenario 6**, we execute a valid upgrade to v3.0.0. The smart contract authorizes the update and automatically advances `minAcceptedVersion` to **300**.
> * Now in **Scenario 7**, a rogue operator tries to rollback the minimum version back to 200. The smart contract immediately **reverts with custom error `InvalidVersionRollback`**. Rollback is cryptographically and logically impossible on-chain.
> * Finally, in **Scenario 8**, when a zero-day is discovered, the Security Auditor revokes Firmware v2.0.0 on-chain. Any future installation attempt is immediately rejected with **FIRMWARE REVOKED**."

#### [3:30 – 4:00] The Audit Trail & Honest Limitations
*(Navigate to the **Audit Trail** tab)*
> "Every single approval, revocation, version increment, and downgrade rejection is preserved as an on-chain event with block numbers and transaction hashes.
> 
> **Honest Limitations:**
> 1. Blockchain does not prevent physical hardware extraction via JTAG/microprobing; physical devices must use Hardware Secure Elements (e.g., ATECC608A / ARM TrustZone) and OTP eFuses in tandem with blockchain authorization.
> 2. Direct L1 querying by low-power microcontrollers (e.g., ESP32) is bandwidth-heavy; in production, lightweight cryptographic Merkle proofs or gateway sidecars are utilized.
> 
> ChainGuard delivers verifiable, multi-stakeholder trust that prevents downgrade exploits without costly proprietary cloud infrastructure. Thank you!"

---

## 2. Likely Judge Questions & In-Depth Technical Answers

### Q1: "Why use a blockchain instead of a centralized SQL database with TLS certificates?"
**Answer:**
> "If a single company owns the manufacturer, the auditors, and the entire device fleet, a centralized database with a root CA would be simpler. 
> However, critical IoT deployments—such as smart electrical grids, medical facilities, or municipal transit—involve **multiple adversarial stakeholders**:
> 1. **Equipment Manufacturers** (who want to push updates and limit liability),
> 2. **Independent Regulatory & Security Auditors** (who mandate CVE disclosure and safety standards),
> 3. **Critical Infrastructure Operators** (who own the devices and require operational uptime).
> 
> If a centralized database were used, whoever hosts that database (or whoever holds the root admin credentials) has unilateral power to silently roll back versions, delete records of known CVEs, or push unvetted firmware. A smart contract provides **multi-party consensus, non-repudiation, role separation, and immutability**. Neither the vendor nor the operator can unilaterally roll back minimum version constraints."

---

### Q2: "Can an attacker bypass this if they have physical access to the device with a JTAG debugger?"
**Answer:**
> "No software or blockchain system alone can defeat physical silicon-level extraction if physical security fuses are unblown.
> In a production hardware deployment, ChainGuard works in tandem with:
> 1. **Secure Boot:** Verifying the bootloader signature from internal ROM.
> 2. **Hardware eFuses / OTP (One-Time Programmable) Registers:** When the blockchain records an authorized version advancement (e.g. 100 -> 200), the device hardware writes to internal anti-rollback eFuses which physically cannot be unburned.
> 3. **Debug Port Disabling:** JTAG and SWD pins are permanently disabled during factory provisioning.
> ChainGuard provides the decentralized source of truth and proof of authorization that directs the hardware to blow those fuses."

---

### Q3: "Isn't communicating with an EVM blockchain too heavy for low-power microcontrollers (e.g., ESP32, STM32, Cortex-M0)?"
**Answer:**
> "Microcontrollers do not run full Ethereum nodes or execute EVM bytecode directly.
> In ChainGuard's architecture:
> 1. Devices communicate through an **IoT Edge Gateway** (like a local substation controller or smart building gateway running our backend verification service).
> 2. Alternatively, for direct-to-cloud IoT, the device receives an **EIP-712 typed authorization receipt** or a Merkle inclusion proof verifying that `FirmwareRegistry.authorizeUpdate` was confirmed in a finalized block.
> 3. The device only needs to verify an Ed25519 signature and check integer `versionCode >= localMinVersion`, which takes under 2 milliseconds and less than 16 KB of RAM."

---

### Q4: "Why store only the SHA-256 hash on-chain rather than the entire firmware binary?"
**Answer:**
> "Storing binaries directly in Ethereum storage is prohibitively expensive and inefficient. Storing a modest 2 MB firmware binary on Ethereum would cost thousands of dollars in gas and cause blockchain state bloat.
> Storing the **cryptographic SHA-256 hash (32 bytes)** provides identical mathematical integrity guarantees:
> * Finding a second pre-image for SHA-256 requires $2^{256}$ operations (computationally impossible).
> * The binary file itself is distributed over IPFS, CDN, or local peer-to-peer mirrors, while the blockchain acts as the lightweight, tamper-proof notary and policy engine."

---

### Q5: "How does your system prevent semantic version confusion (e.g., '1.10.0' vs '1.2.0')?"
**Answer:**
> "Naive string comparison in code often fails (e.g., in ASCII string sorting, `'1.10.0' < '1.2.0'`). 
> ChainGuard eliminates this vulnerability by enforcing a **monotonically increasing integer `versionCode`** directly in the Solidity contract:
> * Version 1.0.0 = `100`
> * Version 2.0.0 = `200`
> * Version 2.1.0 = `210`
> * Version 3.0.0 = `300`
> 
> Comparison on-chain is evaluated as `require(fw.versionCode >= dev.minAcceptedVersion)`. Integer comparison in the EVM is mathematically deterministic, gas-efficient, and immune to string parsing bugs."

---

### Q6: "What happens if a vendor's private signing key is compromised?"
**Answer:**
> "In traditional PKI systems, revoking a compromised vendor certificate requires distributing CRLs (Certificate Revocation Lists) or OCSP, which IoT devices frequently fail to check due to network timeouts.
> In ChainGuard:
> 1. The **Security Auditor role** immediately invokes `revokeFirmware(firmwareId, reason)` on the smart contract.
> 2. The revocation is instant and global across all gateways and connected devices querying the ledger.
> 3. Even if an attacker holds the vendor's private key and generates valid digital signatures, every gateway and device rejects the update because `firmware.isRevoked == true`."

---

### Q7: "What prevents a rogue firmware vendor from publishing backdoored firmware?"
**Answer:**
> "ChainGuard enforces **Role Separation (Multi-Party Trust)**:
> * Accounts with `FIRMWARE_PUBLISHER_ROLE` can only call `registerFirmware()`. This creates a record with `isApproved = false`.
> * Only accounts with the distinct `SECURITY_AUDITOR_ROLE` can call `approveFirmware()`.
> * The smart contract's `authorizeUpdate()` function explicitly checks:
>   `if (!fw.isApproved) revert FirmwareNotApproved(firmwareId);`
> A vendor cannot unilaterally publish and authorize firmware without independent compliance review."

---

### Q8: "How does ChainGuard scale to fleets with 500,000 IoT devices?"
**Answer:**
> "In massive deployments:
> 1. Devices are registered in **Device Classes / Fleet Profiles** on-chain rather than individual per-device storage slots (e.g., `ESP32-GridMeter-EU-Batch2026`).
> 2. Layer-2 rollups (Arbitrum, Optimism, Base, or Polygon CDK) reduce gas costs to fractions of a cent per authorization event.
> 3. Edge gateways batch-verify authorizations locally using cached block headers, only writing to the L2 when a device class minimum version advances."

---

## 3. Demo Quick Reference Card (For Presenters)

| Scenario | File / Action | Expected Badge | Key Point to Mention |
|---|---|---|---|
| **1. Valid Firmware** | `firmware_v2.0.0.bin` | `APPROVED` | All 6 checks pass; real on-chain transaction recorded. |
| **2. Downgrade Attack** | `firmware_v1.0.0.bin` | `DOWNGRADE ATTACK DETECTED` | **Valid signature**, but version 100 < minAcceptedVersion 200. |
| **3. Tampered Binary** | `firmware_v2.0.0_tampered.bin` | `HASH MISMATCH` | Single flipped byte fails SHA-256 integrity against on-chain record. |
| **4. Untrusted Key** | Untrusted signature manifest | `INVALID SIGNATURE` | Unrecognized developer key blocked by vendor public key pinning. |
| **5. Rogue Auditor** | Unauthorized approval tx | `UNAUTHORIZED ACCESS PREVENTED` | Smart contract AccessControl reverts unauthorized approval. |
| **6. Upgrade Release** | `firmware_v3.0.0.bin` | `APPROVED` | Authorizes v3 and advances device min version to 300. |
| **7. Version Rollback** | Attempt to lower min version to 200 | `ROLLBACK PREVENTED` | Solidity reverts with `InvalidVersionRollback(300, 200)`. |
| **8. Revocation** | Revoke v2 with CVE reason | `FIRMWARE REVOKED` | Immediate network-wide zero-day neutralization. |
