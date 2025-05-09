const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

exports.registerPatient = async (req, res) => {
  const { name, age, address } = req.body;
  try {
    const patient = await Patient.create({ name, age, address });
    res.json({ message: 'Patient registered', patient });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};

exports.registerDoctor = async (req, res) => {
  const { name, specialization, experience, hospital, address } = req.body;
  try {
    const doctor = await Doctor.create({ name, specialization, experience, hospital, address });
    res.json({ message: 'Doctor registered', doctor });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};

exports.loginByWallet = async (req, res) => {
    const { walletAddress } = req.body;
  console.log("walletAddress",walletAddress)
    if (!walletAddress) return res.status(400).json({ message: 'Wallet address is required' });
  
    try {
      const patient = await Patient.findOne({ where: { address:walletAddress } });
      const doctor = await Doctor.findOne({ where: { address:walletAddress } });
  
      if (patient || doctor) {
        return res.status(200).json(patient?{...patient.dataValues,userType:1}:{...doctor.dataValues,userType:2});
      } else {
        return res.status(404).json({ message: 'User not registered' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Verification failed' });
    }
  };
  
  
