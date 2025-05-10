const express = require("express");
const {
  registerPatient,
  registerDoctor,
  loginByWallet,
} = require("../controllers/authController");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const router = express.Router();

// Registration routes
router.post("/register-patient", registerPatient);
router.post("/register-doctor", registerDoctor);

// Login route
router.post("/login", loginByWallet);

// Get all doctors
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      attributes: ["id", "name", "specialization", "hospital", "address"],
    });
    res.json(doctors);
  } catch (err) {
    console.error("Error fetching doctors:", err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// Get all patients
router.get("/patients", async (req, res) => {
  try {
    const patients = await Patient.findAll({
      attributes: ["id", "name", "age", "address"],
    });
    res.json(patients);
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

module.exports = router;
