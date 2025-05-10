// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PatientRecords {
    struct Access {
        bool granted;
        uint expiresAt;
    }

    // New struct to return patient data with their record
    struct PatientRecord {
        address patientAddress;
        string ipfsHash;
        uint expiresAt;
    }

    mapping(address => string) public patientToHash;
    mapping(address => mapping(address => Access)) public accessControl;
    // accessControl[patient][doctor] => Access

    // Track all patients who have uploaded records
    address[] private allPatients;
    // Track which patients have granted access to which doctors
    mapping(address => address[]) private doctorToPatients;

    event RecordUploaded(address indexed patient, string ipfsHash);
    event AccessGranted(address indexed patient, address indexed doctor, uint expiresAt);

    // Patient uploads or updates their record
    function uploadRecord(string calldata ipfsHash) external {
        // Check if this is a new patient
        if (bytes(patientToHash[msg.sender]).length == 0) {
            allPatients.push(msg.sender);
        }
        
        patientToHash[msg.sender] = ipfsHash;
        emit RecordUploaded(msg.sender, ipfsHash);
    }

    // Patient grants access to a doctor with an expiry
    function grantAccess(address doctor, uint expiresAt) external {
        // Check if this is the first time granting access to this doctor
        if (!accessControl[msg.sender][doctor].granted) {
            doctorToPatients[doctor].push(msg.sender);
        }
        
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
        string memory record = patientToHash[msg.sender];
        if (bytes(record).length == 0) {
            return "No record found";
        }
        return record;
    }
    
    // NEW FUNCTION: Get all records a doctor has access to
    function getDoctorAccessibleRecords(address doctor) external view returns (PatientRecord[] memory) {
        // Get list of patients who granted access to this doctor
        address[] memory patients = doctorToPatients[doctor];
        
        // Count how many patients currently have valid access
        uint validAccessCount = 0;
        for (uint i = 0; i < patients.length; i++) {
            address patient = patients[i];
            Access memory access = accessControl[patient][doctor];
            if (access.granted && access.expiresAt > block.timestamp) {
                validAccessCount++;
            }
        }
        
        // Create array of patient records
        PatientRecord[] memory records = new PatientRecord[](validAccessCount);
        uint currentIndex = 0;
        
        // Fill the array with records of patients that have granted valid access
        for (uint i = 0; i < patients.length; i++) {
            address patient = patients[i];
            Access memory access = accessControl[patient][doctor];
            
            if (access.granted && access.expiresAt > block.timestamp) {
                records[currentIndex] = PatientRecord({
                    patientAddress: patient,
                    ipfsHash: patientToHash[patient],
                    expiresAt: access.expiresAt
                });
                currentIndex++;
            }
        }
        
        return records;
    }
    
    // For frontend debugging: Get all patients who have ever granted access to this doctor
    function getPatientsWhoGrantedAccess(address doctor) external view returns (address[] memory) {
        return doctorToPatients[doctor];
    }
}
