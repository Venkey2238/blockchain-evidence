const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.initialized = false;
    this.network = null;
  }

  async initialize() {
    if (this.initialized) return true;

    const rpcUrl = process.env.POLYGON_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      throw new Error('Blockchain configuration missing in .env');
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      const abiPath = path.join(__dirname, '../../contracts/EvidenceStorage.abi.json');
      if (!fs.existsSync(abiPath)) {
        throw new Error('Contract ABI not found');
      }

      const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
      
      this.network = await this.provider.getNetwork();
      this.initialized = true;
      
      return true;
    } catch (error) {
      this.initialized = false;
      throw new Error(`Blockchain initialization failed: ${error.message}`);
    }
  }

  async storeEvidence(fileHash, metadata) {
    await this.initialize();

    const metadataString = JSON.stringify(metadata);
    const tx = await this.contract.storeEvidence(fileHash, metadataString);
    
    const receipt = await tx.wait(2);

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      from: receipt.from,
      to: receipt.to,
      status: receipt.status === 1 ? 'success' : 'failed',
      timestamp: Date.now(),
    };
  }

  async getEvidence(evidenceId) {
    await this.initialize();
    const evidence = await this.contract.getEvidence(evidenceId);

    return {
      fileHash: evidence[0],
      metadata: JSON.parse(evidence[1]),
      uploadedBy: evidence[2],
      timestamp: Number(evidence[3]),
      isSealed: evidence[4],
    };
  }

  async verifyHash(fileHash) {
    await this.initialize();
    const result = await this.contract.verifyHash(fileHash);

    return {
      exists: result[0],
      evidenceId: result[1].toString(),
    };
  }

  async estimateGas(fileHash, metadata) {
    await this.initialize();
    const metadataString = JSON.stringify(metadata);
    const gasEstimate = await this.contract.storeEvidence.estimateGas(fileHash, metadataString);
    return gasEstimate.toString();
  }

  async getBalance() {
    await this.initialize();
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  async getBlockNumber() {
    await this.initialize();
    return await this.provider.getBlockNumber();
  }

  getExplorerUrl(txHash) {
    const chainId = this.network?.chainId ? Number(this.network.chainId) : 80002;
    if (chainId === 80002) {
      return `https://amoy.polygonscan.com/tx/${txHash}`;
    } else if (chainId === 137) {
      return `https://polygonscan.com/tx/${txHash}`;
    }
    return `https://polygonscan.com/tx/${txHash}`;
  }

  getAddressExplorerUrl(address) {
    const chainId = this.network?.chainId ? Number(this.network.chainId) : 80002;
    if (chainId === 80002) {
      return `https://amoy.polygonscan.com/address/${address}`;
    } else if (chainId === 137) {
      return `https://polygonscan.com/address/${address}`;
    }
    return `https://polygonscan.com/address/${address}`;
  }

  isInitialized() {
    return this.initialized;
  }

  getNetworkInfo() {
    return {
      name: this.network?.name || 'unknown',
      chainId: this.network?.chainId ? Number(this.network.chainId) : 0,
      contractAddress: process.env.CONTRACT_ADDRESS,
      walletAddress: this.wallet?.address,
    };
  }
}

module.exports = new BlockchainService();
