const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

exports.registerPatient = async (req, res) => {
  const { name, age, address } = req.body;
  try {
    if (!name || !age || !address) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the user already exists with this wallet address
    const existingPatient = await Patient.findOne({ where: { address } });
    const existingDoctor = await Doctor.findOne({ where: { address } });

    if (existingPatient || existingDoctor) {
      return res
        .status(400)
        .json({ error: "Wallet address already registered" });
    }

    const patient = await Patient.create({
      name,
      age,
      address,
    });

    res.status(201).json({
      message: "Patient registered successfully",
      patient,
    });
  } catch (err) {
    console.error("Patient registration error:", err);
    res
      .status(500)
      .json({ error: "Registration failed", details: err.message });
  }
};

exports.registerDoctor = async (req, res) => {
  const { name, specialization, experience, hospital, address } = req.body;
  try {
    if (!name || !specialization || !experience || !hospital || !address) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the user already exists with this wallet address
    const existingPatient = await Patient.findOne({ where: { address } });
    const existingDoctor = await Doctor.findOne({ where: { address } });

    if (existingPatient || existingDoctor) {
      return res
        .status(400)
        .json({ error: "Wallet address already registered" });
    }

    const doctor = await Doctor.create({
      name,
      specialization,
      experience,
      hospital,
      address,
    });

    res.status(201).json({
      message: "Doctor registered successfully",
      doctor,
    });
  } catch (err) {
    console.error("Doctor registration error:", err);
    res
      .status(500)
      .json({ error: "Registration failed", details: err.message });
  }
};

exports.loginByWallet = async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: "Wallet address is required" });
  }

  try {
    const patient = await Patient.findOne({
      where: { address: walletAddress },
    });
    const doctor = await Doctor.findOne({ where: { address: walletAddress } });

    if (patient) {
      return res.status(200).json({
        ...patient.dataValues,
        userType: 1, // Patient
      });
    } else if (doctor) {
      return res.status(200).json({
        ...doctor.dataValues,
        userType: 2, // Doctor
      });
    } else {
      return res.status(404).json({ message: "User not registered" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
