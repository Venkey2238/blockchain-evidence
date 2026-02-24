const { ethers } = require('ethers');

// In-memory store for used nonces to prevent replay attacks
// Key: nonce (string), Value: expiry timestamp (number)
const usedNonces = new Map();

// Periodically clean up expired nonces to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [nonce, expiry] of usedNonces.entries()) {
      if (now > expiry) {
        usedNonces.delete(nonce);
      }
    }
  },
  60 * 60 * 1000,
).unref();

const verifySignature = (req, res, next) => {
  try {
    let claimedWallet =
      req.body.userWallet ||
      req.query.userWallet ||
      req.params.userWallet ||
      req.body.adminWallet ||
      req.query.adminWallet ||
      req.params.adminWallet ||
      req.params.wallet ||
      req.body.wallet ||
      req.query.wallet;

    if (!claimedWallet && req.path.includes('/login/wallet') && req.body.walletAddress) {
      claimedWallet = req.body.walletAddress;
    }

    // Only apply cryptographic verification to endpoints that rely on wallet authentication
    if (!claimedWallet) {
      return next();
    }

    if (typeof claimedWallet !== 'string') {
      return res.status(400).json({ error: 'Invalid wallet format' });
    }

    const { signature, message } = req.headers;

    if (!signature || !message) {
      return res.status(401).json({
        error: 'Authentication required. Missing message or signature in headers.',
      });
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(message);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid message format. Expected JSON payload.' });
    }

    const { nonce, timestamp, method, path } = parsedPayload;

    if (!nonce || !timestamp) {
      return res.status(400).json({ error: 'Message payload must include nonce and timestamp.' });
    }

    // Verify timestamp within 5 minutes
    const MAX_AGE = 5 * 60 * 1000;
    const messageTime = new Date(timestamp).getTime();
    if (isNaN(messageTime) || Math.abs(Date.now() - messageTime) > MAX_AGE) {
      return res.status(401).json({ error: 'Signature timestamp is expired or invalid.' });
    }

    if (usedNonces.has(nonce)) {
      return res.status(401).json({ error: 'Signature replay detected. Nonce already used.' });
    }

    // Include request binding: optionally check method and path if provided in the payload
    if (method && method.toUpperCase() !== req.method.toUpperCase()) {
      return res
        .status(401)
        .json({ error: 'HTTP method in signature payload does not match request.' });
    }

    if (path && req.originalUrl !== path && req.path !== path) {
      return res
        .status(401)
        .json({ error: 'HTTP path in signature payload does not match request.' });
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== claimedWallet.toLowerCase()) {
      return res
        .status(403)
        .json({ error: 'Cryptographic signature does not match claimed wallet' });
    }

    // Mark nonce as used
    usedNonces.set(nonce, messageTime + MAX_AGE);

    req.authenticatedWallet = recoveredAddress.toLowerCase();
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    res.status(401).json({ error: 'Invalid cryptographic signature' });
  }
};

module.exports = { verifySignature };
