import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Input,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Paper,
  TextField,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import axios from "axios";
import { ethers } from "ethers";
import ContractABI from "../artifacts/contracts/PatientRecords.sol/PatientRecords.json"; // Your compiled ABI
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Updated contract address

const PatientDashboard = ({ session }) => {
  const [file, setFile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [expiry, setExpiry] = useState("");
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [storedHash, setStoredHash] = useState(null);
  const [grantedAccesses, setGrantedAccesses] = useState([]);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [doctorAddress, setDoctorAddress] = useState("");

  useEffect(() => {
    // Fetch doctor list from backend
    const fetchDoctors = async () => {
      try {
        const res = await axios.get("http://localhost:3001/api/auth/doctors"); // backend must return doctor list
        setDoctors(res.data);
      } catch (err) {
        console.error("Error fetching doctors:", err);
      }
    };
    fetchDoctors();
  }, []);

  const handleUpload = async () => {
    if (!file) return showAlert("Please select a file first.", "warning");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:3001/api/ipfs/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("IPFS Response:", res);

      // 2. Save hash on blockchain
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      const tx = await contract.uploadRecord(res.data.cid);
      await tx.wait();

      showAlert("File uploaded successfully to IPFS.", "success");
    } catch (err) {
      console.error("Upload error:", err);
      showAlert(
        "Failed to upload file: " + (err.response?.data?.error || err.message),
        "error"
      );
    }
  };

  const fetchUploadedHash = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      // Use getMyRecord function to get the current user's record
      const hash = await contract.getMyRecord();

      if (hash === "No record found") {
        showAlert("You haven't uploaded any records yet", "info");
        setStoredHash(null);
      } else {
        setStoredHash(hash);
        showAlert("Retrieved your record successfully", "success");
      }
    } catch (error) {
      console.error("Error fetching IPFS hash from blockchain:", error);
      showAlert("Failed to fetch hash: " + error.message, "error");
    }
  };

  // Check all granted accesses
  const checkGrantedAccesses = async () => {
    setCheckingAccess(true);
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const patientAddress = await signer.getAddress();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      const accessList = [];
      const now = Math.floor(Date.now() / 1000);

      // Check status for all doctors in the system
      for (const doctor of doctors) {
        try {
          // Normalize doctor address
          const normalizedDoctorAddress = ethers.getAddress(doctor.address);
          console.log(
            `Checking access for doctor: ${doctor.name} (${normalizedDoctorAddress})`
          );

          // Get access info
          const accessInfo = await contract.accessControl(
            patientAddress,
            normalizedDoctorAddress
          );
          console.log(`Access info for ${doctor.name}:`, accessInfo);

          accessList.push({
            doctor: doctor.name,
            address: normalizedDoctorAddress,
            granted: accessInfo.granted,
            expiresAt: Number(accessInfo.expiresAt),
            isExpired: Number(accessInfo.expiresAt) <= now,
            formattedExpiry: new Date(
              Number(accessInfo.expiresAt) * 1000
            ).toLocaleString(),
          });
        } catch (error) {
          console.error(
            `Error checking access for doctor ${doctor.name}:`,
            error
          );
        }
      }

      // Check a specific doctor if address entered manually
      if (doctorAddress) {
        try {
          const normalizedDoctorAddress = ethers.getAddress(doctorAddress);
          const accessInfo = await contract.accessControl(
            patientAddress,
            normalizedDoctorAddress
          );

          accessList.push({
            doctor: "Manual Address",
            address: normalizedDoctorAddress,
            granted: accessInfo.granted,
            expiresAt: Number(accessInfo.expiresAt),
            isExpired: Number(accessInfo.expiresAt) <= now,
            formattedExpiry: new Date(
              Number(accessInfo.expiresAt) * 1000
            ).toLocaleString(),
          });
        } catch (error) {
          console.error(`Error checking access for manual address:`, error);
        }
      }

      setGrantedAccesses(accessList);

      if (accessList.filter((a) => a.granted).length === 0) {
        showAlert("You haven't granted access to any doctors yet", "info");
      } else {
        showAlert(
          `Found ${
            accessList.filter((a) => a.granted).length
          } doctors with granted access`,
          "success"
        );
      }
    } catch (err) {
      console.error("Error checking granted accesses:", err);
      showAlert("Failed to check granted accesses: " + err.message, "error");
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedDoctor || !expiry) {
      return showAlert("Please select a doctor and expiry time.", "warning");
    }

    try {
      // Convert expiry time to a Unix timestamp (seconds)
      const expiryDate = new Date(expiry);
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);

      // Connect to blockchain
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      // Grant access via smart contract
      const tx = await contract.grantAccess(selectedDoctor, expiryTimestamp);

      // Wait for the transaction to be mined
      console.log("Transaction submitted, waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      showAlert("Access granted successfully to doctor.", "success");

      // Check granted accesses to verify
      await checkGrantedAccesses();
    } catch (err) {
      console.error("Error granting access:", err);
      showAlert("Failed to grant access: " + err.message, "error");
    }
  };

  // Add a new function to handle revoking access
  const handleRevokeAccess = async (doctorAddress) => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not installed");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        signer
      );

      // Revoke access via smart contract
      const tx = await contract.revokeAccess(doctorAddress);
      console.log("Transaction submitted, waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      showAlert(`Access revoked for doctor: ${doctorAddress}`, "success");

      // Refresh the list of granted accesses
      await checkGrantedAccesses();
    } catch (err) {
      console.error("Error revoking access:", err);
      showAlert("Failed to revoke access: " + err.message, "error");
    }
  };

  const showAlert = (message, severity) => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Patient Dashboard
      </Typography>
      <Box my={3}>
        <Typography variant="h6">Upload Medical Record</Typography>
        <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          sx={{ mt: 2 }}
        >
          Upload File
        </Button>
      </Box>

      {/* View Uploaded Record Section */}
      <Button variant="contained" color="secondary" onClick={fetchUploadedHash}>
        View Uploaded Record
      </Button>
      {storedHash && (
        <Typography sx={{ mt: 2 }}>
          <strong>Stored IPFS Hash:</strong> {storedHash}
        </Typography>
      )}

      <Box my={4}>
        <Typography variant="h6">Grant Access to Doctor</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Doctor</InputLabel>
          <Select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {doctors.map((doc) => (
              <MenuItem key={doc.address} value={doc.address}>
                {doc.name} - {doc.specialization}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Input
          type="datetime-local"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          placeholder="Expiry Date"
          fullWidth
          sx={{ my: 2 }}
        />

        <Button
          variant="contained"
          color="secondary"
          onClick={handleGrantAccess}
        >
          Grant Access
        </Button>
      </Box>

      {/* Display Granted Accesses */}
      <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Doctors With Access Granted</Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={checkGrantedAccesses}
            disabled={checkingAccess}
          >
            {checkingAccess ? "Checking..." : "Check Access Status"}
          </Button>
        </Box>

        <Box display="flex" alignItems="center" mb={2}>
          <TextField
            label="Check Doctor Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            value={doctorAddress}
            onChange={(e) => setDoctorAddress(e.target.value)}
            size="small"
            sx={{ mr: 2 }}
          />
        </Box>

        {grantedAccesses.length > 0 ? (
          <List>
            {grantedAccesses.map((access, index) => (
              <React.Fragment key={index}>
                <ListItem
                  sx={{
                    borderLeft: `4px solid ${
                      access.granted && !access.isExpired
                        ? "#4caf50"
                        : "#ff9800"
                    }`,
                    backgroundColor: access.granted
                      ? access.isExpired
                        ? "#fff3e0"
                        : "#e8f5e9"
                      : "#f5f5f5",
                  }}
                >
                  <ListItemText
                    primary={`Doctor: ${access.doctor} ${
                      access.granted ? "(Granted)" : "(Not Granted)"
                    }`}
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          component="span"
                          display="block"
                        >
                          Address: {access.address}
                        </Typography>
                        <Typography
                          variant="body2"
                          component="span"
                          display="block"
                        >
                          Expires:{" "}
                          {access.granted ? access.formattedExpiry : "N/A"}
                          {access.isExpired && access.granted
                            ? " (EXPIRED)"
                            : ""}
                        </Typography>
                      </>
                    }
                  />
                  {/* Add Revoke button if access is granted and not expired */}
                  {access.granted && !access.isExpired && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleRevokeAccess(access.address)}
                      sx={{ ml: 2 }}
                    >
                      Revoke Access
                    </Button>
                  )}
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : checkingAccess ? (
          <Typography variant="body1" align="center" sx={{ py: 2 }}>
            Checking access status...
          </Typography>
        ) : (
          <Typography variant="body1" align="center" sx={{ py: 2 }}>
            Click "Check Access Status" to see who has access to your records
          </Typography>
        )}
      </Paper>

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

export default PatientDashboard;
