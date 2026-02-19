// Web3 Contract Integration for Frontend
class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = null;
    this.contractABI = null;
  }

  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();

    const response = await fetch('/api/blockchain/config');
    const config = await response.json();
    
    this.contractAddress = config.contractAddress;
    this.contractABI = config.abi;

    this.contract = new ethers.Contract(
      this.contractAddress,
      this.contractABI,
      this.signer
    );
  }

  async storeEvidence(fileHash, metadata) {
    if (!this.contract) await this.initialize();

    const tx = await this.contract.storeEvidence(
      fileHash,
      JSON.stringify(metadata)
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async verifyHash(fileHash) {
    if (!this.contract) await this.initialize();
    
    const result = await this.contract.verifyHash(fileHash);
    return {
      exists: result[0],
      evidenceId: result[1].toString(),
    };
  }

  async getEvidence(evidenceId) {
    if (!this.contract) await this.initialize();
    
    const evidence = await this.contract.getEvidence(evidenceId);
    return {
      fileHash: evidence[0],
      metadata: JSON.parse(evidence[1]),
      uploadedBy: evidence[2],
      timestamp: Number(evidence[3]),
      isSealed: evidence[4],
    };
  }

  getExplorerUrl(txHash) {
    const network = window.ethereum.chainId === '0x13881' ? 'mumbai.' : '';
    return `https://${network}polygonscan.com/tx/${txHash}`;
  }
}

window.blockchainService = new BlockchainService();
