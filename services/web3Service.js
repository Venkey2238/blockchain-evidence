const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class Web3Service {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const rpcUrl = process.env.POLYGON_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      this.initialized = false;
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      const abiPath = path.join(__dirname, '../contracts/EvidenceStorage.abi.json');
      if (!fs.existsSync(abiPath)) {
        this.initialized = false;
        return;
      }

      const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
    }
  }

  async storeEvidence(fileHash, metadata) {
    await this.initialize();
    if (!this.initialized) {
      throw new Error('Blockchain not configured');
    }

    const tx = await this.contract.storeEvidence(fileHash, JSON.stringify(metadata));
    const receipt = await tx.wait(2);

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      evidenceId: receipt.logs[0]?.topics[1],
    };
  }

  async getEvidence(evidenceId) {
    await this.initialize();
    const evidence = await this.contract.getEvidence(evidenceId);

    return {
      fileHash: evidence[0],
      metadata: evidence[1],
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
    const gasEstimate = await this.contract.storeEvidence.estimateGas(
      fileHash,
      JSON.stringify(metadata)
    );
    return gasEstimate.toString();
  }

  getExplorerUrl(txHash) {
    const network = process.env.POLYGON_RPC_URL.includes('mumbai') ? 'mumbai.' : '';
    return `https://${network}polygonscan.com/tx/${txHash}`;
  }
}

module.exports = new Web3Service();
