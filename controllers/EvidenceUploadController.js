const { supabase } = require('../config');
const { validateWalletAddress } = require('../middleware/verifyAdmin');
const integratedEvidenceService = require('../services/integratedEvidenceService');
const blockchainService = require('../services/blockchain/blockchainService');
const ipfsStorageService = require('../services/storage/ipfsStorageService');

// Enhanced Evidence Upload with REAL Blockchain & IPFS
const uploadEvidence = async (req, res) => {
  try {
    const { caseId, type, description, location, collectionDate, uploadedBy } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!caseId || !type || !uploadedBy) {
      return res.status(400).json({ error: 'Case ID, type, and uploader are required' });
    }

    if (!validateWalletAddress(uploadedBy)) {
      return res.status(400).json({ error: 'Invalid uploader wallet address' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('wallet_address', uploadedBy.toLowerCase())
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    if (user.role === 'public_viewer') {
      return res.status(403).json({ error: 'Public viewers cannot upload evidence' });
    }

    const allowedTypes = {
      'application/pdf': 100,
      'image/jpeg': 50,
      'image/jpg': 50,
      'image/png': 50,
      'image/gif': 25,
      'video/mp4': 500,
      'video/avi': 500,
      'video/mov': 500,
      'audio/mp3': 100,
      'audio/wav': 200,
      'audio/m4a': 100,
      'application/msword': 50,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 50,
      'text/plain': 10,
      'application/zip': 500,
      'application/x-rar-compressed': 500,
      'application/vnd.ms-excel': 50,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 50,
    };

    const maxSize = allowedTypes[file.mimetype];
    if (!maxSize) {
      return res.status(400).json({
        error: `File type ${file.mimetype} not supported`,
        supportedTypes: Object.keys(allowedTypes),
      });
    }

    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return res.status(400).json({
        error: `File too large. Maximum size for ${file.mimetype} is ${maxSize}MB`,
        fileSize: file.size,
        maxSize: maxSizeBytes,
      });
    }

    const metadata = {
      caseId,
      type,
      description,
      location,
      collectionDate,
      mimeType: file.mimetype,
    };

    const results = await integratedEvidenceService.uploadEvidence(
      file.buffer,
      file.originalname,
      metadata,
      uploadedBy,
    );

    const errors = results?.errors || [];

    if (!results) {
      return res.status(500).json({ success: false, error: 'Upload service returned no results' });
    }

    res.json({
      success: true,
      evidence: {
        ...results?.database,
        explorerUrl: results?.blockchain?.txHash
          ? blockchainService.getExplorerUrl(results.blockchain.txHash)
          : null,
        ipfsUrl: results?.ipfs?.cid ? ipfsStorageService.getGatewayUrl(results.ipfs.cid) : null,
      },
      blockchain: results?.blockchain || null,
      ipfs: results?.ipfs || null,
      message:
        errors.length > 0
          ? `Evidence uploaded with warnings: ${errors.map((e) => e.error).join(', ')}`
          : 'Evidence uploaded successfully to database, blockchain, and IPFS',
      warnings: errors,
    });
  } catch (error) {
    console.error('Evidence upload failed:', error);
    res.status(500).json({ error: 'Upload failed.' });
  }
};

module.exports = {
  uploadEvidence,
};
