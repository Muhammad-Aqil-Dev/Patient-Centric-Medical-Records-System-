import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  Card,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Grid,
} from "@mui/material";
import axios from "axios";
import { ethers } from "ethers";
import ContractABI from "../artifacts/contracts/PatientRecords.sol/PatientRecords.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const DoctorDashboard = () => {
  const [patientAddress, setPatientAddress] = useState("");
  const [patientRecord, setPatientRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [accessiblePatients, setAccessiblePatients] = useState([]);
  const [isTestingAccess, setIsTestingAccess] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [currentWalletAddress, setCurrentWalletAddress] = useState("");
  const [requestingPatientAddress, setRequestingPatientAddress] = useState("");
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);

  const showAlert = (message, severity) => {
    setNotification({ open: true, message, severity });
  };

  // Function to get the current wallet address
  const getCurrentWalletAddress = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      const formattedAddress = ethers.getAddress(address); // Normalize it
      setCurrentWalletAddress(formattedAddress);
      console.log("Current wallet address:", formattedAddress);

      return formattedAddress;
    } catch (err) {
      console.error("Error getting wallet address:", err);
      showAlert("Failed to get wallet address: " + err.message, "error");
      return null;
    }
  };

  // Fetch registered patients from backend
  const fetchRegisteredPatients = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/api/auth/patients"
      );
      return response.data;
    } catch (err) {
      console.error("Error fetching patients:", err);
      showAlert("Failed to fetch patient list", "error");
      return [];
    }
  };

  // Fix the fetchAccessiblePatients function to properly detect patients with granted access
  const fetchAccessiblePatients = async () => {
    setPatientsLoading(true);
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctorAddress = await signer.getAddress();
      console.log("Doctor address:", doctorAddress);

      // Connect to the contract
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      // First, get all registered patients from the backend
      const response = await axios.get(
        "http://localhost:3001/api/auth/patients"
      );
      console.log("Patients from backend:", response.data);

      // For each patient, check if this doctor has access
      const patientsWithAccess = [];
      const now = Math.floor(Date.now() / 1000);

      // Create a more robust checking process
      for (const patient of response.data) {
        try {
          // Normalize the patient address to ensure correct format
          const normalizedPatientAddress = ethers.getAddress(patient.address);
          console.log(
            `Checking access for patient: ${patient.name} (${normalizedPatientAddress})`
          );

          // Check access directly from the mapping
          const accessInfo = await contract.accessControl(
            normalizedPatientAddress,
            doctorAddress
          );
          console.log(`Access info for ${patient.name}:`, accessInfo);

          const hasValidAccess =
            accessInfo.granted && Number(accessInfo.expiresAt) > now;

          if (hasValidAccess) {
            // If access is granted, also check if we can retrieve their record
            try {
              // This is a second test to confirm access
              const ipfsHash = await contract.getRecord(
                normalizedPatientAddress
              );

              // If we reach here, we definitely have access
              patientsWithAccess.push({
                ...patient,
                expiryDate: new Date(
                  Number(accessInfo.expiresAt) * 1000
                ).toLocaleString(),
                ipfsHash: ipfsHash || "No record uploaded yet",
              });

              console.log(
                `✅ Access confirmed for patient ${
                  patient.name
                }, expiring ${new Date(
                  Number(accessInfo.expiresAt) * 1000
                ).toLocaleString()}`
              );
            } catch (recordError) {
              console.log(
                `❌ Could not get record for patient ${patient.name} despite having access: ${recordError.message}`
              );

              // Still add them to the list if we have access but they don't have a record
              patientsWithAccess.push({
                ...patient,
                expiryDate: new Date(
                  Number(accessInfo.expiresAt) * 1000
                ).toLocaleString(),
                ipfsHash: "Error: " + recordError.message,
              });
            }
          } else {
            console.log(
              `❌ No access to patient ${patient.name}, granted=${
                accessInfo.granted
              }, expires=${new Date(
                Number(accessInfo.expiresAt) * 1000
              ).toLocaleString()}`
            );
          }
        } catch (error) {
          console.error(
            `Error checking access for patient ${patient.name}:`,
            error
          );
        }
      }

      console.log("Patients with access:", patientsWithAccess);
      setAccessiblePatients(patientsWithAccess);

      if (patientsWithAccess.length === 0) {
        showAlert("No patients have granted you access yet.", "info");
      } else {
        showAlert(
          `Found ${patientsWithAccess.length} patients who have granted you access.`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error fetching accessible patients:", error);
      showAlert("Error fetching patients: " + error.message, "error");
    } finally {
      setPatientsLoading(false);
    }
  };

  // Add this to useEffect to run on component mount
  useEffect(() => {
    getCurrentWalletAddress();

    // Add an event listener for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          const address = ethers.getAddress(accounts[0]);
          setCurrentWalletAddress(address);
          console.log("Wallet changed to:", address);
          // Refresh patient list when account changes
          fetchAccessiblePatients();
        }
      });
    }

    // Check for patients who have given access to this doctor
    fetchAccessiblePatients();
  }, []);

  // Add a new function to directly test access to the contract
  const testDirectAccess = async (patientAddr) => {
    setIsTestingAccess(true);
    setTestResult(null);

    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctorAddress = await signer.getAddress();

      console.log("Doctor address:", doctorAddress);
      console.log("Testing access to patient address:", patientAddr);

      // Normalize the patient address
      let normalizedPatientAddress;
      try {
        normalizedPatientAddress = ethers.getAddress(patientAddr);
        console.log("Normalized patient address:", normalizedPatientAddress);
      } catch (error) {
        setTestResult({
          success: false,
          message: `Invalid Ethereum address format: ${error.message}`,
        });
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      // Test step 1: Check accessControl mapping directly
      // IMPORTANT: The contract mapping is accessControl[patient][doctor]
      try {
        // DEBUG: Try both ways to see which one works
        console.log("Checking accessControl with patient then doctor");
        const accessInfo = await contract.accessControl(
          normalizedPatientAddress,
          doctorAddress
        );
        console.log("Raw accessControl response:", accessInfo);

        const now = Math.floor(Date.now() / 1000);
        const hasAccess =
          accessInfo.granted && Number(accessInfo.expiresAt) > now;

        setTestResult({
          success: true,
          message: `Access check result: granted=${
            accessInfo.granted
          }, expiresAt=${new Date(
            Number(accessInfo.expiresAt) * 1000
          ).toLocaleString()}, still valid=${
            Number(accessInfo.expiresAt) > now
          }`,
          accessInfo: {
            granted: accessInfo.granted,
            expiresAt: Number(accessInfo.expiresAt),
            isValid: hasAccess,
          },
        });

        // If granted, try to get the actual record
        if (hasAccess) {
          try {
            const ipfsHash = await contract.getRecord(normalizedPatientAddress);
            console.log("Successfully retrieved IPFS hash:", ipfsHash);

            setTestResult((prev) => ({
              ...prev,
              ipfsHash,
              recordSuccess: true,
              message:
                prev.message + " | Successfully retrieved record: " + ipfsHash,
            }));
          } catch (recordError) {
            console.error("Error retrieving record:", recordError);
            setTestResult((prev) => ({
              ...prev,
              recordSuccess: false,
              recordError: recordError.message,
              message:
                prev.message +
                " | Failed to retrieve record: " +
                recordError.message,
            }));
          }
        }
      } catch (error) {
        console.error("Error checking access:", error);
        setTestResult({
          success: false,
          message: `Failed to check access: ${error.message}`,
        });
      }
    } catch (err) {
      console.error("Error during access test:", err);
      setTestResult({
        success: false,
        message: `Error: ${err.message}`,
      });
    } finally {
      setIsTestingAccess(false);
    }
  };

  // Modify the fetchPatientRecord function to handle case-sensitivity better
  const fetchPatientRecord = async (patientAddr) => {
    setPatientAddress(patientAddr);
    setLoading(true);
    setError(null);
    setPatientRecord(null);

    try {
      // Connect to blockchain
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctorAddress = await signer.getAddress();
      console.log("Doctor address (from signer):", doctorAddress);

      // Print raw addresses for debugging
      console.log("Raw patient address input:", patientAddr);

      // Try to normalize the address, but handle errors
      let normalizedPatientAddress;
      try {
        normalizedPatientAddress = ethers.getAddress(patientAddr);
        console.log("Normalized patient address:", normalizedPatientAddress);
      } catch (error) {
        console.error("Address normalization error:", error);
        setError(`Invalid Ethereum address format: ${error.message}`);
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      // First check access directly
      try {
        const accessInfo = await contract.accessControl(
          normalizedPatientAddress,
          doctorAddress
        );
        console.log("Access info from contract:", accessInfo);

        const now = Math.floor(Date.now() / 1000);
        const hasAccess =
          accessInfo.granted && Number(accessInfo.expiresAt) > now;

        if (!hasAccess) {
          if (!accessInfo.granted) {
            setError(
              "You don't have access to this patient's record. The patient has not granted you permission."
            );
            setLoading(false);
            return;
          } else if (Number(accessInfo.expiresAt) <= now) {
            setError(
              `Your access has expired on ${new Date(
                Number(accessInfo.expiresAt) * 1000
              ).toLocaleString()}`
            );
            setLoading(false);
            return;
          }
        }

        // If we have access, try to get the record
        try {
          const ipfsHash = await contract.getRecord(normalizedPatientAddress);
          console.log("Successfully retrieved IPFS hash:", ipfsHash);

          if (ipfsHash) {
            showAlert("Access granted! Fetching patient record...", "success");

            // Fetch the file from our backend (handles decryption)
            const response = await axios.get(
              `http://localhost:3001/api/ipfs/download?cid=${ipfsHash}`,
              {
                responseType: "blob",
              }
            );

            // Create a download URL for the file
            const fileUrl = URL.createObjectURL(response.data);

            setPatientRecord({
              ipfsHash,
              fileUrl,
            });
          } else {
            setError("The patient has not uploaded any records yet.");
          }
        } catch (recordError) {
          console.error("Error retrieving record:", recordError);
          setError(`Could not retrieve record: ${recordError.message}`);
        }
      } catch (accessCheckError) {
        console.error("Error checking access:", accessCheckError);
        setError(`Failed to check access: ${accessCheckError.message}`);
      }
    } catch (err) {
      console.error("Error accessing patient record:", err);
      setError("Failed to fetch patient record: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (patientRecord?.fileUrl) {
      const link = document.createElement("a");
      link.href = patientRecord.fileUrl;
      link.download = `patient-record-${patientAddress.substring(0, 6)}.file`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Emergency function to request access directly
  const requestDirectAccess = async () => {
    if (!requestingPatientAddress) {
      showAlert("Please enter a patient address", "warning");
      return;
    }

    setIsRequestingAccess(true);
    try {
      // Normalize the patient address to ensure correct format
      let normalizedPatientAddress;
      try {
        normalizedPatientAddress = ethers.getAddress(requestingPatientAddress);
      } catch (error) {
        showAlert("Invalid patient address format", "error");
        setIsRequestingAccess(false);
        return;
      }

      await getCurrentWalletAddress();

      showAlert(
        `The patient with address ${normalizedPatientAddress} needs to grant you (doctor: ${currentWalletAddress}) access through their dashboard.`,
        "info"
      );

      // Copy doctor address to clipboard for easy sharing
      navigator.clipboard
        .writeText(currentWalletAddress)
        .then(() => {
          showAlert(
            "Your address has been copied to clipboard to share with the patient",
            "success"
          );
        })
        .catch((err) => {
          console.error("Could not copy address to clipboard:", err);
        });
    } catch (error) {
      console.error("Error requesting access:", error);
      showAlert("Error: " + error.message, "error");
    } finally {
      setIsRequestingAccess(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Doctor Dashboard
      </Typography>

      {/* Display current wallet address */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: "#f8f9fa" }}>
        <Typography variant="body2">
          <strong>Your Wallet Address:</strong>{" "}
          {currentWalletAddress || "Not connected"}
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={getCurrentWalletAddress}
          sx={{ mt: 1 }}
        >
          Refresh Address
        </Button>

        {/* Add request access section */}
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #eee" }}>
          <Typography variant="subtitle2" color="primary">
            Request Access from Patient
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <TextField
              size="small"
              label="Patient Address"
              placeholder="0x..."
              fullWidth
              value={requestingPatientAddress}
              onChange={(e) => setRequestingPatientAddress(e.target.value)}
              sx={{ mr: 1 }}
            />
            <Button
              variant="outlined"
              size="medium"
              color="secondary"
              onClick={requestDirectAccess}
              disabled={isRequestingAccess}
            >
              Request Access
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Patients Who Granted Access
            </Typography>

            {patientsLoading ? (
              <Box display="flex" justifyContent="center" my={3}>
                <CircularProgress />
              </Box>
            ) : accessiblePatients.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No patients have granted you access yet.
              </Typography>
            ) : (
              <List>
                {accessiblePatients.map((patient) => (
                  <React.Fragment key={patient.id}>
                    <ListItem
                      button
                      onClick={() => fetchPatientRecord(patient.address)}
                      sx={{
                        borderLeft: "4px solid #1976d2",
                        mb: 1,
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                    >
                      <ListItemText
                        primary={patient.name}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              Age: {patient.age}
                            </Typography>
                            <br />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Access expires: {patient.expiryDate}
                            </Typography>
                          </>
                        }
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchPatientRecord(patient.address);
                        }}
                      >
                        View
                      </Button>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={fetchAccessiblePatients}
              disabled={patientsLoading}
              sx={{ mt: 2 }}
              fullWidth
            >
              {patientsLoading ? (
                <CircularProgress size={24} />
              ) : (
                "Refresh Patient List"
              )}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Manual Access to Patient Records
            </Typography>

            <Box display="flex" alignItems="center" mb={3}>
              <TextField
                label="Patient Address"
                variant="outlined"
                fullWidth
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                placeholder="0x..."
                sx={{ mr: 2 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => fetchPatientRecord(patientAddress)}
                disabled={loading || !patientAddress}
              >
                {loading ? <CircularProgress size={24} /> : "Access"}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Add diagnostic tools */}
            <Box mt={3} mb={2}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => testDirectAccess(patientAddress)}
                disabled={isTestingAccess || !patientAddress}
                startIcon={
                  isTestingAccess ? <CircularProgress size={16} /> : null
                }
                sx={{ mb: 2 }}
              >
                Test Direct Contract Access
              </Button>

              {testResult && (
                <Alert
                  severity={
                    testResult.success
                      ? testResult.recordSuccess
                        ? "success"
                        : "warning"
                      : "error"
                  }
                  sx={{ mt: 1 }}
                >
                  <Typography variant="body2">
                    <strong>Test Result:</strong> {testResult.message}
                  </Typography>
                  {testResult.accessInfo && (
                    <Box mt={1}>
                      <Typography variant="caption" display="block">
                        <strong>Access Granted:</strong>{" "}
                        {testResult.accessInfo.granted ? "Yes" : "No"}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Expires:</strong>{" "}
                        {new Date(
                          testResult.accessInfo.expiresAt * 1000
                        ).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Is Valid:</strong>{" "}
                        {testResult.accessInfo.isValid ? "Yes" : "No"}
                      </Typography>
                    </Box>
                  )}
                  {testResult.ipfsHash && (
                    <Typography variant="caption" display="block">
                      <strong>IPFS Hash:</strong> {testResult.ipfsHash}
                    </Typography>
                  )}
                </Alert>
              )}
            </Box>

            {patientRecord && (
              <Card variant="outlined" sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Patient Record Retrieved
                  </Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 2 }}
                  >
                    IPFS Hash: {patientRecord.ipfsHash}
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleDownload}
                  >
                    Download Record
                  </Button>
                </CardContent>
              </Card>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DoctorDashboard;
