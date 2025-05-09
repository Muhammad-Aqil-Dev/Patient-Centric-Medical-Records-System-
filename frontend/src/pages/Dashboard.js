import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Box, Input, MenuItem, Select, FormControl, InputLabel,
  Snackbar, Alert
} from '@mui/material';
import axios from 'axios';
import { ethers } from 'ethers';
import ContractABI from '../artifacts/contracts/PatientRecords.sol/PatientRecords.json'; // Your compiled ABI
const CONTRACT_ADDRESS = '0x1F2E027aC32a114C93d04dF1d9b4E35a192Ad9F6'; // replace with actual contract address

const PatientDashboard = ({ session }) => {
  const [file, setFile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [expiry, setExpiry] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [storedHash, setStoredHash] = useState(null);

  useEffect(() => {
    // Fetch doctor list from backend
    const fetchDoctors = async () => {
      try {
        const res = await axios.get('/api/users/doctors'); // backend must return doctor list
        setDoctors(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDoctors();
  }, []);

  const handleUpload = async () => {
    if (!file) return showAlert('Please select a file first.', 'warning');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/ipfs/upload', formData, {
        headers: {
        //   Authorization: `Bearer ${session.token}`
        }
      });

      console.log(res)

 // 2. Save hash on blockchain
 if (!window.ethereum) throw new Error('MetaMask not installed');
 await window.ethereum.request({ method: 'eth_requestAccounts' });
 console.log("a")
 const provider = new ethers.BrowserProvider(window.ethereum);
 console.log("b")
 const signer = await provider.getSigner();
 console.log("c",signer)
 const contract = new ethers.Contract(CONTRACT_ADDRESS, ContractABI.abi, signer);
 console.log("d",contract)

 const tx = await contract.uploadRecord(res.data.cid);
 console.log("e",tx)

 await tx.wait();
 console.log("f",tx)

      showAlert('File uploaded successfully to IPFS.', 'success');
    } catch (err) {
        console.log(err)
      showAlert('Failed to upload file.', 'error');
    }
  };
  const fetchUploadedHash = async () => {
    try {
        if (!window.ethereum) throw new Error('MetaMask not installed');
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("a")
        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log("b")
        const signer = await provider.getSigner();
        console.log("c",signer)
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ContractABI.abi, signer);
        console.log("d",contract)
       
              
      const address = await signer.getAddress();
      const hash = await contract.getRecord(address);
      setStoredHash(hash);
    } catch (error) {
      console.error("Error fetching IPFS hash from blockchain:", error);
      alert("Failed to fetch hash");
    }
  };
  const handleGrantAccess = async () => {
    if (!selectedDoctor || !expiry) {
      return showAlert('Please select a doctor and expiry time.', 'warning');
    }

    try {
      const res = await axios.post('/api/access/grant', {
        doctorAddress: selectedDoctor,
        expiresAt: expiry
      }, {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      showAlert('Access granted successfully.', 'success');
    } catch (err) {
      showAlert('Failed to grant access.', 'error');
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
        <Button variant="contained" color="primary" onClick={handleUpload} sx={{ mt: 2 }}>
          Upload File
        </Button>
      </Box>
      // In your JSX return block:
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
          <Select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
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

        <Button variant="contained" color="secondary" onClick={handleGrantAccess}>
          Grant Access
        </Button>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PatientDashboard;
