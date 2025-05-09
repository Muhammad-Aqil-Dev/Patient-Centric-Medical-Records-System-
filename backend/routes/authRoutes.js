const express = require('express');
const { registerPatient, registerDoctor, loginByWallet } = require('../controllers/authController');
const router = express.Router();

router.post('/register/patient', registerPatient);
router.post('/register/doctor', registerDoctor);
router.post('/login', loginByWallet);

module.exports = router;