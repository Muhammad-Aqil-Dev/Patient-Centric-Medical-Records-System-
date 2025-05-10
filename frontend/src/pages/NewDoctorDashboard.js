import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  CardActions,
  Alert,
  Chip,
  Snackbar,
  TextField,
} from "@mui/material";
import axios from "axios";
import { ethers } from "ethers";
import ContractABI from "../artifacts/contracts/PatientRecords.sol/PatientRecords.json";

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

const NewDoctorDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [doctorAddress, setDoctorAddress] = useState("");
  const [patients, setPatients] = useState([]);
  const [accessibleRecords, setAccessibleRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [manualPatientAddress, setManualPatientAddress] = useState("");
  const [checkingManualAccess, setCheckingManualAccess] = useState(false);

  // On component mount, get doctor address and fetch data
  useEffect(() => {
    const initialize = async () => {
      await getDoctorWalletAddress();
      await fetchPatients();
    };
    initialize();
  }, []);

  // Watch for MetaMask account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        getDoctorWalletAddress().then(() => fetchAccessiblePatientRecords());
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", () => {
          console.log("Account listener removed");
        });
      }
    };
  }, []);

  // Get doctor's current wallet address
  const getDoctorWalletAddress = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = ethers.getAddress(accounts[0]);
      setDoctorAddress(address);
      console.log("Doctor wallet address:", address);

      return address;
    } catch (err) {
      console.error("Error getting wallet address:", err);
      showNotification(
        "Failed to connect to MetaMask: " + err.message,
        "error"
      );
      return null;
    }
  };

  // Fetch all registered patients from the backend
  const fetchPatients = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/api/auth/patients"
      );
      console.log(response);
      setPatients(response.data);
      console.log("Fetched patients:", response.data);
    } catch (err) {
      console.error("Error fetching patients:", err);
      showNotification("Failed to fetch patients from server", "error");
    }
  };

  // Fetch all patient records the doctor has access to via smart contract
  const fetchAccessiblePatientRecords = async () => {
    if (!doctorAddress) {
      await getDoctorWalletAddress();
    }

    setLoading(true);
    setError(null);
    setAccessibleRecords([]);

    try {
      // Connect to blockchain
      if (!window.ethereum) throw new Error("MetaMask not installed");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentDoctorAddress = await signer.getAddress();

      if (currentDoctorAddress !== doctorAddress) {
        setDoctorAddress(currentDoctorAddress);
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      console.log("👨‍⚕️ Doctor address:", currentDoctorAddress);
      console.log(
        "🔍 Looking for patient records with access granted to this doctor..."
      );

      // Debug: Show contract address
      console.log("📝 Contract address:", CONTRACT_ADDRESS);

      // First get all patients who have ever granted access to this doctor
      // This should return the same list as the new function
      const patientsWithAccess = await contract.getPatientsWhoGrantedAccess(
        currentDoctorAddress
      );
      console.log(
        "👥 Patients who have ever granted access:",
        patientsWithAccess
      );

      if (patientsWithAccess.length === 0) {
        console.log("❌ No patients have ever granted you access");
        showNotification("No patients have granted you access yet.", "info");
        setLoading(false);
        return;
      }

      const accessiblePatientRecords = [];
      const now = Math.floor(Date.now() / 1000);
      console.log("⏰ Current timestamp:", now);

      // Check each patient from the list of patients who granted access
      for (const patientAddress of patientsWithAccess) {
        try {
          console.log(`\n🧑 Checking patient address: ${patientAddress}`);

          // Find patient info in our list
          const patientInfo = patients.find(
            (p) => p.address.toLowerCase() === patientAddress.toLowerCase()
          ) || {
            address: patientAddress,
            name: "Unknown Patient",
          };

          // Check access directly from the contract mapping
          const accessInfo = await contract.accessControl(
            patientAddress,
            currentDoctorAddress
          );

          console.log(
            "✅ Access info received from contract:",
            JSON.stringify({
              granted: accessInfo.granted,
              expiresAt: Number(accessInfo.expiresAt),
              expiresAtFormatted: new Date(
                Number(accessInfo.expiresAt) * 1000
              ).toLocaleString(),
              isValid: accessInfo.granted && Number(accessInfo.expiresAt) > now,
            })
          );

          const hasAccess =
            accessInfo &&
            accessInfo.granted &&
            Number(accessInfo.expiresAt) > now;

          if (hasAccess) {
            console.log(
              `🎉 Access CONFIRMED for patient at address ${patientAddress}`
            );

            // Try to get the IPFS hash
            try {
              console.log(
                `Attempting to get record for patient ${patientAddress}`
              );
              const ipfsHash = await contract.getRecord(patientAddress);
              console.log(
                `🔑 IPFS Hash retrieved:`,
                ipfsHash || "No hash found"
              );

              if (ipfsHash && ipfsHash !== "") {
                accessiblePatientRecords.push({
                  patient: patientInfo,
                  ipfsHash: ipfsHash,
                  expiryDate: new Date(Number(accessInfo.expiresAt) * 1000),
                  expiryTimestamp: Number(accessInfo.expiresAt),
                });
              } else {
                console.log(`⚠️ Patient has not uploaded a record yet`);
                // Still add them to the list with no hash
                accessiblePatientRecords.push({
                  patient: patientInfo,
                  ipfsHash: null,
                  expiryDate: new Date(Number(accessInfo.expiresAt) * 1000),
                  expiryTimestamp: Number(accessInfo.expiresAt),
                  noRecordUploaded: true,
                });
              }
            } catch (recordError) {
              console.error(`❌ Error retrieving record:`, recordError);
              // Add with error info
              accessiblePatientRecords.push({
                patient: patientInfo,
                ipfsHash: null,
                expiryDate: new Date(Number(accessInfo.expiresAt) * 1000),
                expiryTimestamp: Number(accessInfo.expiresAt),
                error: recordError.message,
              });
            }
          } else {
            console.log(`❌ No valid access to patient at ${patientAddress}`);
          }
        } catch (err) {
          console.error(`❌ Error checking access for patient:`, err);
        }
      }

      console.log(
        `📊 Final results: Found ${accessiblePatientRecords.length} accessible patient records`
      );
      setAccessibleRecords(accessiblePatientRecords);

      if (accessiblePatientRecords.length === 0) {
        showNotification("No patients have granted you active access.", "info");
      } else {
        showNotification(
          `Found ${accessiblePatientRecords.length} patient records you can access.`,
          "success"
        );
      }
    } catch (err) {
      console.error("Error fetching accessible records:", err);
      setError("Failed to fetch records: " + err.message);
      showNotification("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle checking access for a manually entered patient address
  const checkManualPatientAccess = async () => {
    if (!manualPatientAddress) {
      showNotification("Please enter a patient address", "warning");
      return;
    }

    setCheckingManualAccess(true);
    try {
      // Format address properly
      const normalizedPatientAddress = ethers.getAddress(manualPatientAddress);
      console.log(`Testing access to patient: ${normalizedPatientAddress}`);

      // Connect to blockchain
      if (!window.ethereum) throw new Error("MetaMask not installed");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      const currentDoctorAddress = await signer.getAddress();
      console.log(`Doctor address: ${currentDoctorAddress}`);
      const now = Math.floor(Date.now() / 1000);

      // Check access mapping first
      // CRITICAL: Order of parameters was correct here
      console.log(
        `Calling contract.accessControl with params: ${normalizedPatientAddress}, ${currentDoctorAddress}`
      );
      const accessInfo = await contract.accessControl(
        normalizedPatientAddress,
        currentDoctorAddress
      );

      console.log(
        "Access info:",
        JSON.stringify({
          granted: accessInfo.granted,
          expiresAt: Number(accessInfo.expiresAt),
          expiresAtFormatted: new Date(
            Number(accessInfo.expiresAt) * 1000
          ).toLocaleString(),
        })
      );

      const hasAccess =
        accessInfo && accessInfo.granted && Number(accessInfo.expiresAt) > now;

      if (hasAccess) {
        console.log("Access CONFIRMED ✅");
        try {
          // Try to get the record
          const ipfsHash = await contract.getRecord(normalizedPatientAddress);

          if (ipfsHash && ipfsHash !== "") {
            console.log(`IPFS hash retrieved: ${ipfsHash}`);
            // Create a record object and add it to our accessible records if not already there
            const patientExists = accessibleRecords.some(
              (record) =>
                record.patient.address.toLowerCase() ===
                normalizedPatientAddress.toLowerCase()
            );

            // Try to get patient details from our list
            const patientInfo = patients.find(
              (p) =>
                p.address.toLowerCase() ===
                normalizedPatientAddress.toLowerCase()
            ) || {
              address: normalizedPatientAddress,
              name: "Unknown Patient",
            };

            const newRecord = {
              patient: patientInfo,
              ipfsHash: ipfsHash,
              expiryDate: new Date(Number(accessInfo.expiresAt) * 1000),
              expiryTimestamp: Number(accessInfo.expiresAt),
              manuallyAdded: true,
            };

            if (!patientExists) {
              setAccessibleRecords((prev) => [...prev, newRecord]);
            }

            showNotification(
              "Access confirmed! Record hash retrieved.",
              "success"
            );
            return;
          } else {
            showNotification(
              "You have access, but the patient hasn't uploaded a record yet.",
              "warning"
            );
          }
        } catch (recordError) {
          console.error("Error getting record:", recordError);
          showNotification(
            "Error getting record: " + recordError.message,
            "error"
          );
        }
      } else {
        console.log("Access DENIED ❌");
        showNotification(
          "You don't have access to this patient's record.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error checking manual access:", err);
      showNotification("Error: " + err.message, "error");
    } finally {
      setCheckingManualAccess(false);
    }
  };

  // Download a patient record from IPFS
  const downloadRecord = async (ipfsHash) => {
    setDownloadLoading(true);
    try {
      // Extract the original upload name or use a default
      const originalFileName = `patient-record-${ipfsHash.substring(0, 8)}.odt`;

      const response = await axios.get(
        `http://localhost:3001/api/ipfs/download?cid=${ipfsHash}&filename=${originalFileName}`,
        {
          responseType: "blob",
        }
      );

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showNotification("Downloaded record successfully", "success");
    } catch (err) {
      console.error("Error downloading record:", err);
      showNotification("Failed to download: " + err.message, "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  // Helper function for showing notifications
  const showNotification = (message, severity) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // Format expiry date
  const formatExpiry = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = timestamp <= now;
    const expiryDate = new Date(timestamp * 1000).toLocaleString();

    if (isExpired) {
      return `Expired: ${expiryDate}`;
    } else {
      return `Expires: ${expiryDate}`;
    }
  };

  // Add a new function to directly fetch accessible records from the smart contract
  const fetchRecordsFromContract = async () => {
    setLoading(true);
    setError(null);
    setAccessibleRecords([]);

    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentDoctorAddress = await signer.getAddress();

      if (currentDoctorAddress !== doctorAddress) {
        setDoctorAddress(currentDoctorAddress);
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      console.log("🔍 Fetching records directly from smart contract...");
      console.log("👨‍⚕️ Doctor address:", currentDoctorAddress);

      // Call the new function we added to the smart contract
      const records = await contract.getDoctorAccessibleRecords(
        currentDoctorAddress
      );
      console.log("📊 Smart contract returned records:", records);

      const formattedRecords = [];

      // Process each record
      for (const record of records) {
        const patientAddress = record.patientAddress;
        const ipfsHash = record.ipfsHash;
        const expiryTimestamp = Number(record.expiresAt);

        console.log(
          `📄 Found record for patient ${patientAddress}, expires at ${new Date(
            expiryTimestamp * 1000
          ).toLocaleString()}`
        );

        // Try to find patient info in our patients list
        const patientInfo = patients.find(
          (p) => p.address.toLowerCase() === patientAddress.toLowerCase()
        ) || {
          address: patientAddress,
          name: "Unknown Patient",
        };

        formattedRecords.push({
          patient: patientInfo,
          ipfsHash: ipfsHash,
          expiryDate: new Date(expiryTimestamp * 1000),
          expiryTimestamp: expiryTimestamp,
        });
      }

      console.log(
        `✅ Successfully fetched ${formattedRecords.length} records from smart contract`
      );
      setAccessibleRecords(formattedRecords);

      if (formattedRecords.length === 0) {
        showNotification("No patients have granted you access yet.", "info");
      } else {
        showNotification(
          `Found ${formattedRecords.length} patient records you can access.`,
          "success"
        );
      }
    } catch (err) {
      console.error("Error fetching records from contract:", err);
      setError(`Failed to fetch records: ${err.message}`);
      showNotification("Error fetching records: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // For debugging: Fetch all patients who have ever granted access to this doctor
  const fetchPatientsWhoGrantedAccess = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentDoctorAddress = await signer.getAddress();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      const patientAddresses = await contract.getPatientsWhoGrantedAccess(
        currentDoctorAddress
      );
      console.log(
        "👥 Patients who have ever granted access:",
        patientAddresses
      );

      return patientAddresses;
    } catch (err) {
      console.error("Error fetching patients who granted access:", err);
      return [];
    }
  };

  // Component rendering
  return (
    <Container maxWidth="md">
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Doctor Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          View all patient records you have access to
        </Typography>
      </Box>

      {/* Display doctor's wallet address */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, bgcolor: "#f8f9fa" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Your Wallet Address</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={getDoctorWalletAddress}
            sx={{ ml: 2 }}
          >
            Connect Wallet
          </Button>
        </Box>

        <Typography
          variant="body1"
          component="div"
          sx={{
            mt: 2,
            p: 1,
            borderRadius: 1,
            bgcolor: "#e3f2fd",
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}
        >
          {doctorAddress || "Not connected to MetaMask"}
        </Typography>
      </Paper>

      {/* Section for checking a specific patient */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Check Specific Patient Record
        </Typography>

        <Box display="flex" alignItems="center" mt={2}>
          <TextField
            label="Patient Address"
            placeholder="0x..."
            variant="outlined"
            fullWidth
            size="small"
            value={manualPatientAddress}
            onChange={(e) => setManualPatientAddress(e.target.value)}
            sx={{ mr: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={checkManualPatientAccess}
            disabled={checkingManualAccess || !manualPatientAddress}
          >
            {checkingManualAccess ? (
              <CircularProgress size={24} />
            ) : (
              "Check Access"
            )}
          </Button>
        </Box>
      </Paper>

      {/* Patient Records Section */}
      <Box mb={4}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5" component="h2">
            Patient Records
          </Typography>
          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={fetchRecordsFromContract}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : null
              }
              sx={{ mr: 1 }}
            >
              {loading ? "Loading..." : "Fetch From Contract"}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={fetchAccessiblePatientRecords}
              disabled={loading}
            >
              Check Patient by Patient
            </Button>
          </Box>
        </Box>

        {/* Debug button for fetchPatientsWhoGrantedAccess */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="text"
            color="secondary"
            size="small"
            onClick={async () => {
              const patients = await fetchPatientsWhoGrantedAccess();
              showNotification(
                `Found ${patients.length} patients who have granted access historically`,
                "info"
              );
            }}
          >
            Debug: Show All Patients with Access History
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {console.log(accessibleRecords)}
        {accessibleRecords.length > 0 ? (
          <Box>
            <List>
              {accessibleRecords.map((record, index) => (
                <Paper
                  key={index}
                  elevation={1}
                  sx={{
                    mb: 2,
                    borderLeft: `4px solid ${
                      record.noRecordUploaded ? "#ff9800" : "#4caf50"
                    }`,
                  }}
                >
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="h6">
                            {record.patient.name}
                          </Typography>
                          <Chip
                            label={formatExpiry(record.expiryTimestamp)}
                            color={
                              record.expiryTimestamp >
                              Math.floor(Date.now() / 1000)
                                ? "success"
                                : "error"
                            }
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            component="span"
                            display="block"
                          >
                            Patient Address: {record.patient.address}
                          </Typography>

                          {record.noRecordUploaded ? (
                            <Typography variant="body2" color="warning.main">
                              This patient has granted you access but hasn't
                              uploaded any records yet
                            </Typography>
                          ) : record.error ? (
                            <Typography variant="body2" color="error">
                              Error: {record.error}
                            </Typography>
                          ) : (
                            <Box mt={1}>
                              <Typography
                                variant="body2"
                                component="span"
                                display="block"
                                sx={{ wordBreak: "break-all" }}
                              >
                                <strong>IPFS Hash:</strong> {record.ipfsHash}
                              </Typography>

                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                sx={{ mt: 1 }}
                                onClick={() => downloadRecord(record.ipfsHash)}
                                disabled={downloadLoading || !record.ipfsHash}
                              >
                                {downloadLoading ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  "Download Record"
                                )}
                              </Button>
                            </Box>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          </Box>
        ) : loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No Records Found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No patients have granted you access yet or you need to refresh the
              list.
            </Typography>
          </Paper>
        )}
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
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

export default NewDoctorDashboard;
