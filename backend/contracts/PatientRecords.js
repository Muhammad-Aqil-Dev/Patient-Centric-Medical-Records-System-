const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
// require("../../HardHatProject/artifacts/contracts/PatientRecords.sol/PatientRecords.json")
// Load compiled ABI
const contractJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../HardHatProject/artifacts/contracts/PatientRecords.sol/PatientRecords.json"), "utf8")
);

const CONTRACT_ADDRESS = "0xaC303cb168e0486F311B81Beb65244498d744254"; // Replace with real one

// Set up provider and signer (Ganache)
const provider = new ethers.JsonRpcProvider("HTTP://127.0.0.1:7545");
const signer = provider.getSigner(0); // First Ganache account

// Create contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, signer);

module.exports = contract;
