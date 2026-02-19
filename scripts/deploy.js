const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contract with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'MATIC');

  const EvidenceStorage = await hre.ethers.getContractFactory('EvidenceStorage');
  const contract = await EvidenceStorage.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('EvidenceStorage deployed to:', address);

  const deploymentData = {
    address,
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  fs.writeFileSync(
    path.join(__dirname, '../deployment.json'),
    JSON.stringify(deploymentData, null, 2)
  );

  const artifact = await hre.artifacts.readArtifact('EvidenceStorage');
  fs.writeFileSync(
    path.join(__dirname, '../contracts/EvidenceStorage.abi.json'),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log('\nDeployment complete!');
  console.log('Contract address:', address);
  console.log('Network:', hre.network.name);
  console.log('\nUpdate .env with:');
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log('\nVerify contract with:');
  console.log(`npx hardhat verify --network ${hre.network.name} ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
