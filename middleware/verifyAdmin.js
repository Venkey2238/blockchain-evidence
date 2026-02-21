const { supabase } = require('../config');

// Validation helper
const validateWalletAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Middleware to verify admin permissions
const verifyAdmin = async (req, res, next) => {
  try {
    const { adminWallet } = req.body;

    if (!adminWallet || !validateWalletAddress(adminWallet)) {
      return res.status(400).json({ error: 'Invalid admin wallet address' });
    }

    // Enforce admin check in production: only allow wallets that are registered as active admins
    const { data: admin, error } = await supabase
      .from('users')
      .select('id, wallet_address, full_name, role, is_active, department, jurisdiction, email')
      .eq('wallet_address', adminWallet)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Log admin actions
const logAdminAction = async (adminWallet, actionType, targetWallet, details) => {
  try {
    await supabase.from('admin_actions').insert({
      admin_wallet: adminWallet,
      action_type: actionType,
      target_wallet: targetWallet,
      details: details,
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};

module.exports = {
  verifyAdmin,
  logAdminAction,
  validateWalletAddress,
};
