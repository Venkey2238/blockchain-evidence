const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataJWT = process.env.PINATA_JWT;
    this.gateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  }

  async uploadFile(fileBuffer, fileName, metadata = {}) {
    if (!this.pinataJWT) {
      throw new Error('IPFS service not configured. Set PINATA_JWT in .env file');
    }

    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);

    const pinataMetadata = JSON.stringify({
      name: fileName,
      keyvalues: metadata,
    });
    formData.append('pinataMetadata', pinataMetadata);

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        Authorization: `Bearer ${this.pinataJWT}`,
      },
    });

    return {
      cid: response.data.IpfsHash,
      size: response.data.PinSize,
      timestamp: response.data.Timestamp,
    };
  }

  async getFile(cid) {
    const url = `${this.gateway}${cid}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  async pinStatus(cid) {
    const response = await axios.get(`https://api.pinata.cloud/pinning/pinJobs?ipfs_pin_hash=${cid}`, {
      headers: {
        Authorization: `Bearer ${this.pinataJWT}`,
      },
    });
    return response.data;
  }

  getGatewayUrl(cid) {
    return `${this.gateway}${cid}`;
  }
}

module.exports = new IPFSService();
