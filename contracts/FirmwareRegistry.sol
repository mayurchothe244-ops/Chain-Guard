// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FirmwareRegistry
 * @author ChainGuard Security Team
 * @notice Enforces immutable firmware provenance, multi-party approval, and downgrade attack
 *         protection for critical IoT device fleets.
 * @dev Rejects any firmware version below a device's monotonic minimum accepted version mark.
 */
contract FirmwareRegistry is AccessControl {
    bytes32 public constant FIRMWARE_PUBLISHER_ROLE = keccak256("FIRMWARE_PUBLISHER_ROLE");
    bytes32 public constant SECURITY_AUDITOR_ROLE = keccak256("SECURITY_AUDITOR_ROLE");
    bytes32 public constant DEVICE_OPERATOR_ROLE = keccak256("DEVICE_OPERATOR_ROLE");

    struct Firmware {
        bytes32 firmwareId;
        string versionString;
        uint256 versionCode;
        bytes32 sha256Hash;
        string deviceModel;
        address publisher;
        bool isApproved;
        bool isRevoked;
        uint256 releaseTimestamp;
        string metadataUri;
    }

    struct Device {
        string deviceId;
        string deviceModel;
        address owner;
        uint256 minAcceptedVersion;
        uint256 lastUpdatedTimestamp;
        bool isActive;
        bool exists;
    }

    // Storage mappings
    mapping(bytes32 => Firmware) private _firmwares;
    bytes32[] private _firmwareIds;

    mapping(string => Device) private _devices;
    string[] private _deviceIds;

    // Custom errors for gas efficiency and precise debugging
    error DeviceNotFound(string deviceId);
    error DeviceAlreadyExists(string deviceId);
    error DeviceInactive(string deviceId);
    error FirmwareNotFound(bytes32 firmwareId);
    error FirmwareAlreadyExists(bytes32 firmwareId);
    error FirmwareNotApproved(bytes32 firmwareId);
    error FirmwareAlreadyRevoked(bytes32 firmwareId);
    error IncompatibleDeviceModel(string expectedModel, string actualModel);
    error HashMismatch(bytes32 expectedHash, bytes32 actualHash);
    error DowngradeAttackDetected(uint256 currentMinVersion, uint256 attemptedVersion);
    error InvalidVersionRollback(uint256 currentMinVersion, uint256 requestedMinVersion);
    error InvalidVersionCode();
    error EmptyIdentifier();

    // Events
    event DeviceRegistered(
        string indexed deviceId,
        string deviceModel,
        address indexed owner,
        uint256 minAcceptedVersion,
        uint256 timestamp
    );

    event DeviceMinVersionUpdated(
        string indexed deviceId,
        uint256 oldMinVersion,
        uint256 newMinVersion,
        uint256 timestamp
    );

    event DeviceStatusChanged(
        string indexed deviceId,
        bool isActive,
        uint256 timestamp
    );

    event FirmwareRegistered(
        bytes32 indexed firmwareId,
        string versionString,
        uint256 versionCode,
        bytes32 sha256Hash,
        string deviceModel,
        address indexed publisher,
        uint256 timestamp
    );

    event FirmwareApproved(
        bytes32 indexed firmwareId,
        address indexed auditor,
        uint256 timestamp
    );

    event FirmwareRevoked(
        bytes32 indexed firmwareId,
        address indexed auditor,
        string reason,
        uint256 timestamp
    );

    event UpdateAuthorized(
        string indexed deviceId,
        bytes32 indexed firmwareId,
        uint256 versionCode,
        address indexed operator,
        uint256 timestamp
    );

    event UpdateRejected(
        string indexed deviceId,
        bytes32 indexed firmwareId,
        string reason,
        uint256 timestamp
    );

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) {
            initialAdmin = msg.sender;
        }

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(FIRMWARE_PUBLISHER_ROLE, initialAdmin);
        _grantRole(SECURITY_AUDITOR_ROLE, initialAdmin);
        _grantRole(DEVICE_OPERATOR_ROLE, initialAdmin);
    }

    // =========================================================================
    // DEVICE MANAGEMENT
    // =========================================================================

    /**
     * @notice Register a new IoT device with an initial minimum accepted version.
     */
    function registerDevice(
        string calldata deviceId,
        string calldata deviceModel,
        uint256 initialMinVersion
    ) external onlyRole(DEVICE_OPERATOR_ROLE) {
        if (bytes(deviceId).length == 0) revert EmptyIdentifier();
        if (_devices[deviceId].exists) revert DeviceAlreadyExists(deviceId);

        _devices[deviceId] = Device({
            deviceId: deviceId,
            deviceModel: deviceModel,
            owner: msg.sender,
            minAcceptedVersion: initialMinVersion,
            lastUpdatedTimestamp: block.timestamp,
            isActive: true,
            exists: true
        });

        _deviceIds.push(deviceId);

        emit DeviceRegistered(
            deviceId,
            deviceModel,
            msg.sender,
            initialMinVersion,
            block.timestamp
        );
    }

    /**
     * @notice Advance the device's minimum accepted firmware version.
     * @dev Strictly enforces monotonic increase. Rollback is impossible.
     */
    function advanceDeviceMinVersion(
        string calldata deviceId,
        uint256 newMinVersion
    ) public onlyRole(DEVICE_OPERATOR_ROLE) {
        Device storage dev = _devices[deviceId];
        if (!dev.exists) revert DeviceNotFound(deviceId);
        if (newMinVersion <= dev.minAcceptedVersion) {
            revert InvalidVersionRollback(dev.minAcceptedVersion, newMinVersion);
        }

        uint256 oldVersion = dev.minAcceptedVersion;
        dev.minAcceptedVersion = newMinVersion;
        dev.lastUpdatedTimestamp = block.timestamp;

        emit DeviceMinVersionUpdated(deviceId, oldVersion, newMinVersion, block.timestamp);
    }

    /**
     * @notice Set device active status (emergency decommission or quarantine).
     */
    function setDeviceStatus(
        string calldata deviceId,
        bool active
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Device storage dev = _devices[deviceId];
        if (!dev.exists) revert DeviceNotFound(deviceId);
        dev.isActive = active;
        emit DeviceStatusChanged(deviceId, active, block.timestamp);
    }

    // =========================================================================
    // FIRMWARE MANAGEMENT
    // =========================================================================

    /**
     * @notice Register new firmware metadata.
     * @dev Generates deterministic firmwareId from deviceModel, versionCode, and sha256Hash.
     */
    function registerFirmware(
        string calldata versionString,
        uint256 versionCode,
        bytes32 sha256Hash,
        string calldata deviceModel,
        string calldata metadataUri
    ) external onlyRole(FIRMWARE_PUBLISHER_ROLE) returns (bytes32) {
        if (versionCode == 0) revert InvalidVersionCode();
        if (sha256Hash == bytes32(0)) revert EmptyIdentifier();

        bytes32 firmwareId = keccak256(
            abi.encodePacked(deviceModel, versionCode, sha256Hash)
        );

        if (_firmwares[firmwareId].releaseTimestamp != 0) {
            revert FirmwareAlreadyExists(firmwareId);
        }

        _firmwares[firmwareId] = Firmware({
            firmwareId: firmwareId,
            versionString: versionString,
            versionCode: versionCode,
            sha256Hash: sha256Hash,
            deviceModel: deviceModel,
            publisher: msg.sender,
            isApproved: false,
            isRevoked: false,
            releaseTimestamp: block.timestamp,
            metadataUri: metadataUri
        });

        _firmwareIds.push(firmwareId);

        emit FirmwareRegistered(
            firmwareId,
            versionString,
            versionCode,
            sha256Hash,
            deviceModel,
            msg.sender,
            block.timestamp
        );

        return firmwareId;
    }

    /**
     * @notice Independent Security Auditor approves a firmware release for deployment.
     */
    function approveFirmware(
        bytes32 firmwareId
    ) external onlyRole(SECURITY_AUDITOR_ROLE) {
        Firmware storage fw = _firmwares[firmwareId];
        if (fw.releaseTimestamp == 0) revert FirmwareNotFound(firmwareId);
        if (fw.isRevoked) revert FirmwareAlreadyRevoked(firmwareId);

        fw.isApproved = true;

        emit FirmwareApproved(firmwareId, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke a firmware release due to identified zero-days or safety defects.
     */
    function revokeFirmware(
        bytes32 firmwareId,
        string calldata reason
    ) external onlyRole(SECURITY_AUDITOR_ROLE) {
        Firmware storage fw = _firmwares[firmwareId];
        if (fw.releaseTimestamp == 0) revert FirmwareNotFound(firmwareId);

        fw.isApproved = false;
        fw.isRevoked = true;

        emit FirmwareRevoked(firmwareId, msg.sender, reason, block.timestamp);
    }

    // =========================================================================
    // VERIFICATION & AUTHORIZATION
    // =========================================================================

    /**
     * @notice Read-only validation of firmware update eligibility without state modification.
     * @return isValid Boolean indicating whether all policy checks passed.
     * @return statusCode Integer error/success code (0 = success, 1-6 = failure reason).
     * @return reason Human-readable diagnostic description of the verification outcome.
     */
    function verifyUpdatePolicy(
        string calldata deviceId,
        bytes32 firmwareId,
        bytes32 providedSha256
    ) external view returns (bool isValid, uint256 statusCode, string memory reason) {
        Device storage dev = _devices[deviceId];
        if (!dev.exists) {
            return (false, 1, "Device not registered in registry");
        }
        if (!dev.isActive) {
            return (false, 2, "Device is marked inactive or quarantined");
        }

        Firmware storage fw = _firmwares[firmwareId];
        if (fw.releaseTimestamp == 0) {
            return (false, 3, "Firmware not registered in registry");
        }
        if (keccak256(bytes(fw.deviceModel)) != keccak256(bytes(dev.deviceModel))) {
            return (false, 4, "Firmware model incompatible with target device");
        }
        if (fw.sha256Hash != providedSha256) {
            return (false, 5, "SHA-256 hash does not match registry");
        }
        if (fw.isRevoked) {
            return (false, 6, "Firmware has been revoked by security auditor");
        }
        if (!fw.isApproved) {
            return (false, 7, "Firmware has not received auditor approval");
        }
        if (fw.versionCode < dev.minAcceptedVersion) {
            return (false, 8, "DOWNGRADE ATTACK: Firmware version is below device minimum accepted version");
        }

        return (true, 0, "All cryptographic and version policy checks passed");
    }

    /**
     * @notice State-changing execution that records an authorized firmware installation.
     * @dev If `autoAdvanceMinVersion` is true, automatically raises device's minimum version.
     */
    function authorizeUpdate(
        string calldata deviceId,
        bytes32 firmwareId,
        bytes32 providedSha256,
        bool autoAdvanceMinVersion
    ) external onlyRole(DEVICE_OPERATOR_ROLE) returns (bool) {
        Device storage dev = _devices[deviceId];
        if (!dev.exists) {
            emit UpdateRejected(deviceId, firmwareId, "Device not found", block.timestamp);
            revert DeviceNotFound(deviceId);
        }
        if (!dev.isActive) {
            emit UpdateRejected(deviceId, firmwareId, "Device inactive", block.timestamp);
            revert DeviceInactive(deviceId);
        }

        Firmware storage fw = _firmwares[firmwareId];
        if (fw.releaseTimestamp == 0) {
            emit UpdateRejected(deviceId, firmwareId, "Firmware not found", block.timestamp);
            revert FirmwareNotFound(firmwareId);
        }

        if (keccak256(bytes(fw.deviceModel)) != keccak256(bytes(dev.deviceModel))) {
            emit UpdateRejected(deviceId, firmwareId, "Incompatible model", block.timestamp);
            revert IncompatibleDeviceModel(dev.deviceModel, fw.deviceModel);
        }

        if (fw.sha256Hash != providedSha256) {
            emit UpdateRejected(deviceId, firmwareId, "Hash mismatch", block.timestamp);
            revert HashMismatch(fw.sha256Hash, providedSha256);
        }

        if (fw.isRevoked) {
            emit UpdateRejected(deviceId, firmwareId, "Firmware revoked", block.timestamp);
            revert FirmwareAlreadyRevoked(firmwareId);
        }

        if (!fw.isApproved) {
            emit UpdateRejected(deviceId, firmwareId, "Firmware not approved", block.timestamp);
            revert FirmwareNotApproved(firmwareId);
        }

        if (fw.versionCode < dev.minAcceptedVersion) {
            emit UpdateRejected(
                deviceId,
                firmwareId,
                "DOWNGRADE ATTACK DETECTED: Version below device minimum",
                block.timestamp
            );
            revert DowngradeAttackDetected(dev.minAcceptedVersion, fw.versionCode);
        }

        // Advance minimum version if requested and valid
        if (autoAdvanceMinVersion && fw.versionCode > dev.minAcceptedVersion) {
            uint256 oldMin = dev.minAcceptedVersion;
            dev.minAcceptedVersion = fw.versionCode;
            dev.lastUpdatedTimestamp = block.timestamp;
            emit DeviceMinVersionUpdated(deviceId, oldMin, fw.versionCode, block.timestamp);
        }

        emit UpdateAuthorized(deviceId, firmwareId, fw.versionCode, msg.sender, block.timestamp);
        return true;
    }

    // =========================================================================
    // VIEW FUNCTIONS & ENUMERATION
    // =========================================================================

    function getDevice(string calldata deviceId) external view returns (Device memory) {
        Device memory dev = _devices[deviceId];
        if (!dev.exists) revert DeviceNotFound(deviceId);
        return dev;
    }

    function getAllDeviceIds() external view returns (string[] memory) {
        return _deviceIds;
    }

    function getDeviceCount() external view returns (uint256) {
        return _deviceIds.length;
    }

    function getFirmware(bytes32 firmwareId) external view returns (Firmware memory) {
        Firmware memory fw = _firmwares[firmwareId];
        if (fw.releaseTimestamp == 0) revert FirmwareNotFound(firmwareId);
        return fw;
    }

    function getAllFirmwareIds() external view returns (bytes32[] memory) {
        return _firmwareIds;
    }

    function getFirmwareCount() external view returns (uint256) {
        return _firmwareIds.length;
    }
}
