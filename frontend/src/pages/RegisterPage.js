import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Grid, Container, Paper } from '@mui/material';
import { Formik, Field, Form } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const patientSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  age: Yup.number().required('Age is required').positive().integer(),
  address: Yup.string().required('Wallet address is required'),
});

const doctorSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  specialization: Yup.string().required('Specialization is required'),
  experience: Yup.number().required('Experience is required').positive().integer(),
  hospital: Yup.string().required('Hospital is required'),
  address: Yup.string().required('Wallet address is required'),
});

const RegistrationForm = ({ userType, walletAddress, setWalletAddress }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (err) {
        console.error('Wallet connection failed:', err);
      }
    } else {
      alert('MetaMask is not installed');
    }
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`http://localhost:5000/api/auth/register/${userType}`, values);
      alert(`Successfully registered ${userType}`);
    } catch (error) {
      console.error(error);
      alert('Registration failed');
    }
    setIsSubmitting(false);
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ padding: 3 }}>
        <Typography variant="h5" gutterBottom>
          {userType.charAt(0).toUpperCase() + userType.slice(1)} Registration
        </Typography>

        <Button variant="outlined" onClick={connectWallet} sx={{ mb: 2 }}>
          {walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...` : 'Connect MetaMask'}
        </Button>

        <Formik
          initialValues={{
            name: '',
            age: userType === 'patient' ? '' : undefined,
            address: walletAddress || '',
            specialization: '',
            experience: '',
            hospital: '',
          }}
          enableReinitialize
          validationSchema={userType === 'patient' ? patientSchema : doctorSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, setFieldValue }) => (
            <Form>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="name"
                    label="Full Name"
                    fullWidth
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                </Grid>
                {userType === 'patient' && (
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      name="age"
                      label="Age"
                      type="number"
                      fullWidth
                      error={touched.age && Boolean(errors.age)}
                      helperText={touched.age && errors.age}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    name="address"
                    label="Wallet Address"
                    fullWidth
                    value={walletAddress}
                    onChange={(e) => {
                      setFieldValue('address', e.target.value);
                      setWalletAddress(e.target.value);
                    }}
                    error={touched.address && Boolean(errors.address)}
                    helperText={touched.address && errors.address}
                  />
                </Grid>
                {userType === 'doctor' && (
                  <>
                    <Grid item xs={12}>
                      <Field
                        as={TextField}
                        name="specialization"
                        label="Specialization"
                        fullWidth
                        error={touched.specialization && Boolean(errors.specialization)}
                        helperText={touched.specialization && errors.specialization}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Field
                        as={TextField}
                        name="experience"
                        label="Years of Experience"
                        type="number"
                        fullWidth
                        error={touched.experience && Boolean(errors.experience)}
                        helperText={touched.experience && errors.experience}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Field
                        as={TextField}
                        name="hospital"
                        label="Current Hospital"
                        fullWidth
                        error={touched.hospital && Boolean(errors.hospital)}
                        helperText={touched.hospital && errors.hospital}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Register'}
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Paper>
    </Container>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();

  const [userType, setUserType] = useState('patient');
  const [walletAddress, setWalletAddress] = useState('');

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', paddingTop: '3rem' }}>
      <Grid container justifyContent="center">
        <Grid item xs={12} sm={8} md={6}>
          <Box display="flex" justifyContent="center" mb={2}>
            <Button
              variant="contained"
              onClick={() => setUserType('patient')}
              sx={{ mr: 2 }}
            >
              Patient
            </Button>
            <Button variant="contained" onClick={() => setUserType('doctor')}>
              Doctor
            </Button>
          </Box>
          <RegistrationForm
            userType={userType}
            walletAddress={walletAddress}
            setWalletAddress={setWalletAddress}
          />
        <p className="text-sm mt-4">Already have an account? <span className="text-blue-500 cursor-pointer" onClick={() => navigate('/signin')}>Sign In</span></p>
        </Grid>

      </Grid>
    </div>
  );
};

export default RegisterPage;
