// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // Deploy the PatientRecords contract
  const PatientRecords = await hre.ethers.getContractFactory("PatientRecords");
  const patientRecords = await PatientRecords.deploy();

  await patientRecords.waitForDeployment();

  const address = await patientRecords.getAddress();
  console.log(`PatientRecords deployed to ${address}`);

  // Log information for frontend configuration
  console.log("\n------------------------------------------------------------");
  console.log("Copy this contract address to your frontend configuration:");
  console.log(`CONTRACT_ADDRESS="${address}"`);
  console.log("------------------------------------------------------------\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
