import React, { useState } from "react";
import { Button, Container, Typography, Box, Alert, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ethers } from "ethers";

const SignIn = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

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
      const walletAddress = accounts[0];

      // Verify user type (patient or doctor) in the database
      const response = await axios.post(
        "http://localhost:3001/api/auth/login",
        {
          walletAddress,
        }
      );

      // Store user data in localStorage for persistent login
      localStorage.setItem("userAddress", walletAddress);
      localStorage.setItem("userType", response.data.userType);
      localStorage.setItem("userData", JSON.stringify(response.data));

      // Route to appropriate dashboard based on user type
      // 1 = Patient, 2 = Doctor (based on your backend API)
      if (response.data.userType === 1) {
        navigate("/dashboard");
      } else if (response.data.userType === 2) {
        navigate("/new-doctor-dashboard");
      } else {
        throw new Error("Unknown user type");
      }
    } catch (err) {
      console.error(err);

      if (err.response && err.response.status === 404) {
        setError("User not found. Please register first.");
      } else {
        setError(err.message || "Failed to connect wallet. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Emergency direct access links for debugging
  const goToPatientDashboard = () => navigate("/patient-dashboard");
  const goToDoctorDashboard = () => navigate("/doctor-dashboard");
  const goToNewDoctorDashboard = () => navigate("/new-doctor-dashboard");

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={connectWallet}
          disabled={loading}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? "Connecting..." : "Connect with MetaMask"}
        </Button>

        <Box sx={{ mt: 2 }}>
          <Typography>
            Don't have an account?{" "}
            <Link href="/register" underline="hover">
              Register
            </Link>
          </Typography>
        </Box>

        {/* Debug links for direct access */}
        <Box
          sx={{
            mt: 4,
            p: 2,
            backgroundColor: "#f5f5f5",
            width: "100%",
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Debug Access (Bypass Login)
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-around",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={goToPatientDashboard}
            >
              Patient Dashboard
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={goToDoctorDashboard}
            >
              Old Doctor Dashboard
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={goToNewDoctorDashboard}
            >
              New Doctor Dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default SignIn;
