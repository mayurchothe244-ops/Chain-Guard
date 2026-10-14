const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("------------------------------------------------------");
  console.log("ChainGuard: Deploying FirmwareRegistry Smart Contract");
  console.log("------------------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with deployer account: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH`);

  const FirmwareRegistryFactory = await hre.ethers.getContractFactory("FirmwareRegistry");
  const firmwareRegistry = await FirmwareRegistryFactory.deploy(deployer.address);

  await firmwareRegistry.waitForDeployment();
  const contractAddress = await firmwareRegistry.getAddress();

  console.log(`FirmwareRegistry deployed successfully at: ${contractAddress}`);

  const signers = await hre.ethers.getSigners();
  const publisher = signers[1];
  const auditor = signers[2];
  const operator = signers[3];

  const PUBLISHER_ROLE = await firmwareRegistry.FIRMWARE_PUBLISHER_ROLE();
  const AUDITOR_ROLE = await firmwareRegistry.SECURITY_AUDITOR_ROLE();
  const OPERATOR_ROLE = await firmwareRegistry.DEVICE_OPERATOR_ROLE();

  await (await firmwareRegistry.grantRole(PUBLISHER_ROLE, publisher.address)).wait();
  await (await firmwareRegistry.grantRole(AUDITOR_ROLE, auditor.address)).wait();
  await (await firmwareRegistry.grantRole(OPERATOR_ROLE, operator.address)).wait();

  console.log(`✓ Granted FIRMWARE_PUBLISHER_ROLE to Account #1: ${publisher.address}`);
  console.log(`✓ Granted SECURITY_AUDITOR_ROLE to Account #2: ${auditor.address}`);
  console.log(`✓ Granted DEVICE_OPERATOR_ROLE to Account #3: ${operator.address}`);

  // Save deployment metadata for backend & frontend
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const outputPath = path.join(__dirname, "..", "deployed-address.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Saved deployment info to: ${outputPath}`);

  // Also ensure backend has immediate access to deployed address
  const backendConfigDir = path.join(__dirname, "..", "backend");
  if (!fs.existsSync(backendConfigDir)) {
    fs.mkdirSync(backendConfigDir, { recursive: true });
  }
  const backendOutputPath = path.join(backendConfigDir, "deployed-address.json");
  fs.writeFileSync(backendOutputPath, JSON.stringify(deploymentInfo, null, 2));

  return contractAddress;
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
