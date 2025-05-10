import React, { useState } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const RegisterPage = () => {
  const [userType, setUserType] = useState(1); // 1 = Patient, 2 = Doctor
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [hospital, setHospital] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask not installed. Please install MetaMask to continue."
        );
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      setError("Failed to connect wallet: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!walletAddress) {
        throw new Error("Please connect your wallet first");
      }

      // Validate form fields
      if (!name) throw new Error("Name is required");

      if (userType === 1) {
        // Patient
        if (!age) throw new Error("Age is required");

        // Register patient
        await axios.post("http://localhost:3001/api/auth/register-patient", {
          name,
          age: parseInt(age),
          address: walletAddress,
        });
      } else {
        // Doctor
        if (!specialization) throw new Error("Specialization is required");
        if (!experience) throw new Error("Experience is required");
        if (!hospital) throw new Error("Hospital is required");

        // Register doctor
        await axios.post("http://localhost:3001/api/auth/register-doctor", {
          name,
          specialization,
          experience: parseInt(experience),
          hospital,
          address: walletAddress,
        });
      }

      // Navigate to sign in page after successful registration
      navigate("/signin");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Register for Medical Records System
        </Typography>

        <Paper elevation={3} sx={{ mt: 3, mb: 4 }}>
          <Tabs
            value={userType}
            onChange={(e, newValue) => setUserType(newValue)}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Register as Patient" value={1} />
            <Tab label="Register as Doctor" value={2} />
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {userType === 1 ? (
            // Patient fields
            <TextField
              margin="normal"
              required
              fullWidth
              label="Age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          ) : (
            // Doctor fields
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Years of Experience"
                type="number"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Hospital/Clinic"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />
            </>
          )}

          <Box sx={{ mt: 3, mb: 2 }}>
            {!walletAddress ? (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={connectWallet}
              >
                Connect MetaMask Wallet
              </Button>
            ) : (
              <TextField
                margin="normal"
                fullWidth
                label="Wallet Address"
                value={walletAddress}
                InputProps={{ readOnly: true }}
              />
            )}
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading || !walletAddress}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? "Registering..." : "Register"}
          </Button>

          <Box textAlign="center">
            <Typography variant="body2">
              Already have an account?{" "}
              <Button variant="text" onClick={() => navigate("/signin")}>
                Sign In
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;
