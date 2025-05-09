// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PatientRecords {
    struct Access {
        bool granted;
        uint expiresAt;
    }

    mapping(address => string) public patientToHash;
    mapping(address => mapping(address => Access)) public accessControl;
    // accessControl[patient][doctor] => Access

    event RecordUploaded(address indexed patient, string ipfsHash);
    event AccessGranted(address indexed patient, address indexed doctor, uint expiresAt);

    // Patient uploads or updates their record
    function uploadRecord(string calldata ipfsHash) external {
        patientToHash[msg.sender] = ipfsHash;
        emit RecordUploaded(msg.sender, ipfsHash);
    }

    // Patient grants access to a doctor with an expiry
    function grantAccess(address doctor, uint expiresAt) external {
        accessControl[msg.sender][doctor] = Access(true, expiresAt);
        emit AccessGranted(msg.sender, doctor, expiresAt);
    }

    // Doctor retrieves patient record if access is granted and not expired
    function getRecord(address patient) external view returns (string memory) {
        Access memory access = accessControl[patient][msg.sender];
        require(access.granted && access.expiresAt > block.timestamp, "Access denied or expired");
        return patientToHash[patient];
    }

    // Optional: Patient can view their own record
    function getMyRecord() external view returns (string memory) {
        return patientToHash[msg.sender];
    }
}
