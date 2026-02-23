const { supabase } = require('../config');
const { validateWalletAddress } = require('../middleware/verifyAdmin');
const integratedEvidenceService = require('../services/integratedEvidenceService');
const blockchainService = require('../services/blockchain/blockchainService');

// Verify evidence hash against blockchain
const verifyEvidenceHash = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: evidence, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    const verification = await integratedEvidenceService.verifyEvidence(id);

    res.json({
      valid: verification.overallValid,
      hash: verification.databaseHash,
      blockchainVerified: verification.blockchainVerified,
      ipfsVerified: verification.ipfsVerified,
      explorerUrl: evidence.blockchain_tx_hash
        ? blockchainService.getExplorerUrl(evidence.blockchain_tx_hash)
        : null,
      errors: verification.errors,
    });
  } catch (error) {
    console.error('Verify evidence error:', error);
    res.status(500).json({ error: 'Failed to verify evidence' });
  }
};

// Get blockchain proof for specific evidence
const getBlockchainProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: evidence, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    const proof = await integratedEvidenceService.getEvidenceProof(id);

    res.json({
      success: true,
      proof: {
        ...proof,
        verification_status: proof.verificationStatus || proof.status || proof.result || 'unknown',
        blockchain_network: proof.blockchain_network || proof.network || 'Polygon',
        verification_method: proof.verification_method || proof.method || 'SHA-256',
        chain_of_custody: {
          created: evidence.timestamp,
          last_accessed: new Date().toISOString(),
          ...proof.chain_of_custody,
        },
        integrity_check: {
          status:
            typeof proof.integrity?.status === 'string' && proof.integrity.status
              ? proof.integrity.status
              : typeof proof.integrity === 'string'
                ? proof.integrity
                : 'unknown',
          verified_at: proof.verificationTimestamp || proof.verified_at || new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Blockchain proof error:', error);
    res.status(500).json({ error: 'Failed to retrieve blockchain proof' });
  }
};

// Verify file integrity against blockchain
const verifyIntegrity = async (req, res) => {
  try {
    const { fileName, fileSize, calculatedHash, evidenceId } = req.body;

    if (!calculatedHash || typeof calculatedHash !== 'string' || calculatedHash.trim() === '') {
      return res
        .status(400)
        .json({ error: 'calculatedHash is required and must be a non-empty string' });
    }

    let evidence = null;
    let safeEvidence = null;
    let verified = false;
    let blockchainHash = null;

    if (evidenceId) {
      const { data: evidenceData, error: errorById } = await supabase
        .from('evidence')
        .select('*')
        .eq('id', evidenceId)
        .single();

      if (errorById && errorById.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Database error retrieving evidence by ID' });
      }

      if (evidenceData) {
        evidence = evidenceData;
        blockchainHash = evidenceData.hash;
        verified = calculatedHash === blockchainHash;
      }
    } else {
      const { data: evidenceData, error: errorByHash } = await supabase
        .from('evidence')
        .select('*')
        .eq('hash', calculatedHash)
        .single();

      if (errorByHash && errorByHash.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Database error retrieving evidence by hash' });
      }

      if (evidenceData) {
        evidence = evidenceData;
        blockchainHash = evidenceData.hash;
        verified = true;
      }
    }

    if (evidence) {
      safeEvidence = {
        id: evidence.id,
        hash: evidence.hash,
        timestamp: evidence.timestamp,
        case_id: evidence.case_id,
        name: evidence.name,
      };
    }

    // Audit log isolated so failure doesn't turn a successful verification into a 500
    try {
      await supabase.from('activity_logs').insert({
        user_id: 'public_verification',
        action: 'evidence_verification',
        details: JSON.stringify({
          fileName,
          fileSize,
          calculatedHash: calculatedHash.substring(0, 16) + '...',
          verified,
          evidenceId,
        }),
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log verification activity:', logError);
    }

    res.json({
      success: true,
      verified,
      calculatedHash,
      blockchainHash,
      evidence: safeEvidence,
      verificationUrl: `${req.protocol}://${req.get('host')}/verify/${calculatedHash}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Generate verification certificate
const generateVerificationCertificate = async (req, res) => {
  try {
    const { fileName, verificationResult, timestamp } = req.body;

    if (!verificationResult || typeof verificationResult !== 'string') {
      return res.status(400).json({ error: 'verificationResult is required and must be a string' });
    }

    const validTimestamp = isFinite(Date.parse(timestamp)) ? new Date(timestamp) : new Date();

    const certificateData = {
      fileName,
      verificationResult,
      timestamp: validTimestamp.toISOString(),
      certificateId: `CERT-${Date.now()}`,
      issuer: 'EVID-DGC Blockchain Evidence System',
    };

    // Sanitize fileName for Content-Disposition to prevent header injection
    const sanitizedFileName = (fileName || 'certificate')
      .replace(/[\r\n"]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);

    const textContent = `
EVIDENCE VERIFICATION CERTIFICATE

Certificate ID: ${certificateData.certificateId}
File Name: ${sanitizedFileName}
Verification Result: ${verificationResult.toUpperCase()}
Verification Date: ${validTimestamp.toLocaleString()}
Issued By: ${certificateData.issuer}

This certificate confirms the integrity verification of the above evidence file.
        `;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="verification_certificate_${sanitizedFileName}_${Date.now()}.txt"`,
    );
    res.send(Buffer.from(textContent));
  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
};

// Public verification endpoint
const publicVerify = async (req, res) => {
  try {
    const { hash } = req.params;

    const { data: evidence, error } = await supabase
      .from('evidence')
      .select('id, title, case_id, timestamp, submitted_by, hash')
      .eq('hash', hash)
      .single();

    if (error || !evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    res.json({
      success: true,
      verified: true,
      evidence: {
        id: evidence.id,
        title: evidence.title,
        case_id: evidence.case_id,
        timestamp: evidence.timestamp,
        submitted_by: evidence.submitted_by
          ? evidence.submitted_by.substring(0, 8) + '...'
          : 'unknown',
        hash: evidence.hash,
      },
      verification_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Public verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Get verification history
const getVerificationHistory = async (req, res) => {
  try {
    const { userWallet, limit = 100 } = req.query;

    if (!validateWalletAddress(userWallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('wallet_address', userWallet)
      .eq('is_active', true)
      .single();

    if (userError || !user || !['admin', 'auditor'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized: Admin or Auditor role required' });
    }

    const parsedLimit = Number(limit);
    const sanitizedLimit =
      Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 1000) : 100;

    const { data: history, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'evidence_verification')
      .order('timestamp', { ascending: false })
      .limit(sanitizedLimit);

    if (error) throw error;

    res.json({ success: true, history });
  } catch (error) {
    console.error('Verification history error:', error);
    res.status(500).json({ error: 'Failed to get verification history' });
  }
};

// Get multiple evidence items for comparison
const compareEvidence = async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({ error: 'Evidence IDs are required' });
    }

    const evidenceIds = ids
      .split(',')
      .map((id) => id.trim())
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (evidenceIds.length < 2) {
      return res
        .status(400)
        .json({ error: 'Please provide at least 2 valid numeric evidence IDs' });
    }

    if (evidenceIds.length > 4) {
      return res.status(400).json({ error: 'Please provide 2-4 evidence IDs' });
    }

    const { data: evidenceItems, error } = await supabase
      .from('evidence')
      .select('*')
      .in('id', evidenceIds);

    if (error) throw error;

    if (!evidenceItems || evidenceItems.length === 0) {
      return res.status(404).json({ error: 'No evidence found with provided IDs' });
    }

    const enrichedEvidence = evidenceItems.map((item) => ({
      ...item,
      blockchain_verified: !!item.blockchain_tx_hash,
      verification_timestamp: item.blockchain_tx_hash ? new Date().toISOString() : null,
    }));

    res.json({
      success: true,
      count: enrichedEvidence.length,
      evidence: enrichedEvidence,
    });
  } catch (error) {
    console.error('Evidence comparison error:', error);
    res.status(500).json({ error: 'Failed to fetch evidence for comparison' });
  }
};

// Create comparison report
const createComparisonReport = async (req, res) => {
  try {
    const { evidenceIds, reportData, generatedBy } = req.body;

    if (!validateWalletAddress(generatedBy)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('wallet_address', generatedBy)
      .eq('is_active', true)
      .single();

    if (userError || !user || !['admin', 'auditor'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized: Admin or Auditor role required' });
    }

    if (!evidenceIds || !Array.isArray(evidenceIds) || evidenceIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 evidence IDs required' });
    }

    const reportRecord = {
      evidence_ids: evidenceIds,
      report_data: reportData,
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
      report_type: 'evidence_comparison',
    };

    // Persist the report to the database
    const { data: insertedReport, error: insertError } = await supabase
      .from('comparison_reports')
      .insert(reportRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to persist comparison report:', insertError);
      return res.status(500).json({ error: 'Failed to save comparison report' });
    }

    await supabase.from('activity_logs').insert({
      user_id: generatedBy,
      action: 'evidence_comparison_report_generated',
      details: `Generated comparison report for ${evidenceIds.length} evidence items`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Comparison report generated successfully',
      report: insertedReport,
    });
  } catch (error) {
    console.error('Comparison report error:', error);
    res.status(500).json({ error: 'Failed to generate comparison report' });
  }
};

module.exports = {
  verifyEvidenceHash,
  getBlockchainProof,
  verifyIntegrity,
  generateVerificationCertificate,
  publicVerify,
  getVerificationHistory,
  compareEvidence,
  createComparisonReport,
};
