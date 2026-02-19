#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 EVID-DGC Blockchain Integration Setup\n');

function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} complete\n`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} exists`);
    return true;
  } else {
    console.log(`❌ ${description} missing`);
    return false;
  }
}

console.log('Step 1: Checking prerequisites...\n');

checkFile('.env', '.env file');
checkFile('contracts/EvidenceStorage.sol', 'Smart contract');

console.log('\nStep 2: Installing dependencies...\n');
runCommand('npm install', 'Installing packages');

console.log('Step 3: Compiling smart contract...\n');
runCommand('npx hardhat compile', 'Compiling contract');

console.log('\n✅ Setup complete!\n');
console.log('Next steps:');
console.log('1. Get Mumbai testnet MATIC: https://faucet.polygon.technology/');
console.log('2. Update .env with your PRIVATE_KEY and PINATA_JWT');
console.log('3. Deploy contract: npm run deploy:mumbai');
console.log('4. Run migration: node migrations/add-blockchain-columns.sql in Supabase');
console.log('5. Start server: npm start\n');
