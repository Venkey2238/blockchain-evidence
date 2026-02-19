const { supabase } = require('../config');
const web3Service = require('../services/web3Service');
const ipfsService = require('../services/ipfsService');
const crypto = require('crypto');

async function migrateEvidence() {
  console.log('Starting evidence migration to blockchain and IPFS...');

  const { data: evidence, error } = await supabase
    .from('evidence')
    .select('*')
    .is('blockchain_tx_hash', null)
    .limit(100);

  if (error) {
    console.error('Error fetching evidence:', error);
    return;
  }

  console.log(`Found ${evidence.length} evidence items to migrate`);

  for (const item of evidence) {
    try {
      console.log(`Processing evidence ID: ${item.id}`);

      let ipfsCid = item.ipfs_cid;
      let hash = item.hash;

      if (!hash) {
        console.log('Skipping - no file data available');
        continue;
      }

      const metadata = {
        fileName: item.name,
        fileSize: item.file_size,
        mimeType: item.file_type,
        caseId: item.case_id,
        originalTimestamp: item.timestamp,
      };

      const blockchainResult = await web3Service.storeEvidence(hash, metadata);

      await supabase
        .from('evidence')
        .update({
          ipfs_cid: ipfsCid,
          blockchain_tx_hash: blockchainResult.txHash,
          blockchain_block_number: blockchainResult.blockNumber,
          gas_used: blockchainResult.gasUsed,
          blockchain_verified: true,
          blockchain_timestamp: new Date().toISOString(),
        })
        .eq('id', item.id);

      console.log(`✓ Migrated evidence ${item.id} - TX: ${blockchainResult.txHash}`);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`✗ Failed to migrate evidence ${item.id}:`, error.message);
    }
  }

  console.log('Migration complete!');
}

migrateEvidence()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
