const hre = require("hardhat");

async function main() {
  const PatientRecords = await hre.ethers.getContractFactory("PatientRecords");
  const contract = await PatientRecords.deploy();
  await contract.waitForDeployment();

  console.log("✅ Contract deployed at:", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
