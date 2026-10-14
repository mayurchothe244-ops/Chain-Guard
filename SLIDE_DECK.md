# BLOCKHACK 2026 — Presentation Slide Content Deck

**Problem Statement:** PS-06: THE DOWNGRADE ATTACK — Lightweight Trust for Critical IoT Firmware  
**Project Name:** ChainGuard  

---

## Slide 1: Prototype / Expected Output & Architecture

### 1. Slide Title
* **Header:** ChainGuard — Blockchain-Based IoT Firmware Downgrade Protection
* **Subtitle:** PS-06: The Downgrade Attack | BLOCKHACK 2026

---

### 2. Main User Workflow (End-to-End OTA Security)
1. **Vendor Signing & Registration:**
   * Firmware publisher builds the binary (`v1.0.0`, `v2.0.0`, `v3.0.0`).
   * Computes SHA-256 binary hash and signs the payload with the vendor's private key (Ed25519).
   * Submits metadata to the Solidity smart contract on-chain. Status starts as `Pending Auditor`.
2. **Independent Multi-Party Approval:**
   * An authorized Security Auditor reviews the build and CVE disclosures.
   * Auditor invokes `approveFirmware()` on the smart contract (`isApproved = true`).
   * If a vulnerability is later found, auditor invokes `revokeFirmware()`, instantly neutralizing the build network-wide.
3. **Smart Contract Anti-Downgrade Policy Enforcement:**
   * Each device maintains an immutable low-water mark: `minAcceptedVersion`.
   * When an update is requested, the contract checks:
     $$\text{attemptedVersion} \ge \text{device.minAcceptedVersion}$$
   * If an attacker attempts to install an older, vulnerable version, the smart contract strictly reverts: `DowngradeAttackDetected`.
4. **Field Device OTA Verification & Hardware Fuse Sync:**
   * Field IoT Gateway verifies ledger authorization receipt.
   * The device verifies the digital signature against the vendor's pinned public key.
   * Upon successful installation, the device updates its non-volatile hardware OTP eFuse counter to permanently lock the new version baseline.

---

### 3. UI Wireframes & Prototype Screen Elements
* **Security Command Center (Overview):**
  * Live Telemetry Counters: Registered Devices, Approved Releases, Downgrades Blocked, Tampering Caught.
  * Real-time network and contract indicator (`0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`).
* **Live Status Badges:**
  * `VERIFIED` / `APPROVED` (Glowing Emerald)
  * `DOWNGRADE ATTACK DETECTED` (Pulsing Crimson)
  * `HASH MISMATCH` (Bright Amber)
  * `INVALID SIGNATURE` (Dark Crimson)
  * `FIRMWARE REVOKED` (Quarantine Slate)
* **Field Hardware OLED Display (Simulated Receiver):**
  * Displays device ID, target architecture (ESP32-XTENSA), secure boot status, current minimum accepted version code, and OTP eFuse status.

---

### 4. Expected Results (Quantitative Metrics)
| Metric | Result | Benchmark / Security Implication |
|---|---|---|
| **Downgrade Attack Rejection Rate** | **100% Blocked** | Older signed versions are rejected regardless of valid vendor signature. |
| **Valid Signature Bypass Prevention** | **0% Bypass** | Solves the fundamental flaw where valid PKI signatures permit downgrade. |
| **Tamper Detection (SHA-256)** | **Instant Rejection** | 1 single flipped byte triggers `HASH MISMATCH` against immutable ledger. |
| **Unauthorized Role Protection** | **100% Revert** | Publishers cannot self-approve without independent auditor sign-off. |
| **Version Monotonicity** | **Strict Monotonic** | Smart contract reverts any attempt to decrease `minAcceptedVersion`. |

---

### 5. Features Planned for Production Implementation
1. **Hardware Secure Element & eFuse Integration:**
   * Direct coupling with hardware crypto chips (Microchip ATECC608A, ARM TrustZone) to burn physical silicon OTP anti-rollback fuses upon blockchain confirmation.
2. **Zero-Knowledge / Merkle Inclusion Proofs:**
   * Provide compact cryptographic proofs (EIP-712 typed receipts) so constrained 8-bit/16-bit microcontrollers can verify ledger state without running an Ethereum node.
3. **Layer-2 Rollup Deployment:**
   * Deployment to Arbitrum, Base, or Polygon CDK to reduce per-device authorization gas costs to under $\$0.001$.
4. **Automated CVE Oracle Integration:**
   * Chainlink oracle connecting directly to the National Vulnerability Database (NVD) to automatically flag and revoke firmware releases upon critical CVE publication.

---

## 6. Slide Design Instructions (PowerPoint / Google Slides)

1. **Slide Background:** Dark Navy / Charcoal (`#0a0f1d`).
2. **Font:** Modern Sans-Serif (`Outfit` or `Inter`) for headers, Monospace (`JetBrains Mono` or `Consolas`) for code/hashes.
3. **Accent Colors:** Neon Green (`#10b981`), Electric Cyan (`#06b6d4`), Alert Red (`#ef4444`).
4. **Corner Placement:** Use the designated corner placeholder (top-right or bottom-right) to paste:
   * Live UI Screenshot of the **Attack Simulator** showing `DOWNGRADE ATTACK DETECTED`, OR
   * Your team photo and BlockHack 2026 logo.
