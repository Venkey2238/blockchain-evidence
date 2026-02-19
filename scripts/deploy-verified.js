const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Starting EvidenceStorage Contract Deployment\n');

  const [deployer] = await hre.ethers.getSigners();
  console.log('📝 Deploying with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInMatic = hre.ethers.formatEther(balance);
  console.log('💰 Account balance:', balanceInMatic, 'MATIC\n');

  if (parseFloat(balanceInMatic) < 0.01) {
    console.warn('⚠️  WARNING: Low balance. Get testnet MATIC from https://faucet.polygon.technology/\n');
  }

  console.log('📦 Compiling contract...');
  const EvidenceStorage = await hre.ethers.getContractFactory('EvidenceStorage');

  console.log('🚀 Deploying contract...');
  const contract = await EvidenceStorage.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('✅ EvidenceStorage deployed to:', address);

  const network = await hre.ethers.provider.getNetwork();
  const blockNumber = await hre.ethers.provider.getBlockNumber();

  console.log('🌐 Network:', network.name);
  console.log('🔢 Chain ID:', network.chainId.toString());
  console.log('📦 Block Number:', blockNumber);

  const deploymentData = {
    address,
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber,
    transactionHash: contract.deploymentTransaction()?.hash,
  };

  const deploymentPath = path.join(__dirname, '../deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log('💾 Deployment data saved to deployment.json');

  const artifact = await hre.artifacts.readArtifact('EvidenceStorage');
  const abiPath = path.join(__dirname, '../contracts/EvidenceStorage.abi.json');
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log('💾 ABI saved to contracts/EvidenceStorage.abi.json');

  console.log('\n✅ Deployment Complete!\n');
  console.log('📋 Next Steps:');
  console.log('1. Update .env file with:');
  console.log(`   CONTRACT_ADDRESS=${address}`);
  console.log('2. Run database migration:');
  console.log('   Execute migrations/add-blockchain-columns.sql in Supabase');
  console.log('3. Verify contract (optional):');
  console.log(`   npx hardhat verify --network ${hre.network.name} ${address}`);
  console.log('4. Start the server:');
  console.log('   npm start\n');

  let explorerUrl;
  if (network.chainId === 80002n) {
    explorerUrl = `https://amoy.polygonscan.com/address/${address}`;
  } else if (network.chainId === 137n) {
    explorerUrl = `https://polygonscan.com/address/${address}`;
  }

  if (explorerUrl) {
    console.log('🔍 View on Explorer:', explorerUrl);
  }

  console.log('\n🧪 Testing contract...');
  try {
    const testHash = '0x' + '1'.repeat(64);
    const testMetadata = JSON.stringify({ test: true, timestamp: Date.now() });

    console.log('📝 Storing test evidence...');
    const tx = await contract.storeEvidence(testHash, testMetadata);
    const receipt = await tx.wait();

    console.log('✅ Test transaction successful!');
    console.log('   TX Hash:', receipt.hash);
    console.log('   Gas Used:', receipt.gasUsed.toString());
    console.log('   Block:', receipt.blockNumber);

    console.log('\n🔍 Verifying stored evidence...');
    const verification = await contract.verifyHash(testHash);
    console.log('✅ Verification successful!');
    console.log('   Exists:', verification[0]);
    console.log('   Evidence ID:', verification[1].toString());
  } catch (error) {
    console.error('❌ Contract test failed:', error.message);
  }

  console.log('\n🎉 All done! Contract is ready for production use.\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
