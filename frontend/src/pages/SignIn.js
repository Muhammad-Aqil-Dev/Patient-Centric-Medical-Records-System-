import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, MenuItem, Select, InputLabel, FormControl, TextField, Grid, Card, CardContent } from '@mui/material';
import { ethers } from 'ethers';
import axios from 'axios';
import PatientRecordsABI from '../artifacts/contracts/PatientRecords.sol/PatientRecords.json';

const CONTRACT_ADDRESS = '0xaC303cb168e0486F311B81Beb65244498d744254';

const Dashboard = ({ user }) => {
  const [file, setFile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    axios.get('/api/doctors')
      .then((res) => setDoctors(res.data))
      .catch((err) => console.error('Failed to load doctors', err));
  }, []);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post('/api/ipfs/upload', formData);
    const cid = res.data.cid;

    // Interact with blockchain to save hash
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, PatientRecordsABI, signer);

    const tx = await contract.setRecord(cid);
    await tx.wait();
    alert('File uploaded and record saved on blockchain.');
  };

  const handleGrantAccess = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, PatientRecordsABI, signer);

    const tx = await contract.grantAccess(selectedDoctor, Math.floor(new Date(expiresAt).getTime() / 1000));
    await tx.wait();
    alert('Access granted to doctor.');
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>Patient Dashboard</Typography>

      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">Upload Medical Record</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <input type="file" onChange={handleFileChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button variant="contained" onClick={handleUpload}>Upload</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Grant Access to Doctor</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Doctor</InputLabel>
                <Select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  label="Select Doctor"
                >
                  {doctors.map((doc) => (
                    <MenuItem key={doc.walletAddress} value={doc.walletAddress}>
                      {doc.name} ({doc.specialization})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                type="datetime-local"
                label="Expiry Time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="contained" onClick={handleGrantAccess} fullWidth>
                Grant
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Dashboard;
