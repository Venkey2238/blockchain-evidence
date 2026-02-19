const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');

router.get('/status', blockchainController.getSystemStatus);
router.get('/config', blockchainController.getBlockchainConfig);
router.get('/stats', blockchainController.getBlockchainStats);
router.get('/ipfs/stats', blockchainController.getIPFSStats);
router.get('/transaction/:txHash', blockchainController.verifyTransaction);
router.post('/estimate-gas', blockchainController.estimateGas);
router.get('/health', blockchainController.healthCheck);

module.exports = router;
