const { supabase, allowedRoles } = require('../config');
const { validateWalletAddress } = require('../middleware/verifyAdmin');
const crypto = require('crypto');

// Wallet login
const walletLogin = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!validateWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Get user by wallet address
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Wallet address not registered' });
    }

    // Log login activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'wallet_login',
      details: JSON.stringify({ auth_type: 'wallet' }),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        jurisdiction: user.jurisdiction,
        badge_number: user.badge_number,
        auth_type: user.auth_type,
      },
    });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Email login
const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password using database function
    const { data: passwordValid, error: verifyError } = await supabase.rpc('verify_password', {
      password,
      hash: user.password_hash,
    });

    if (verifyError || !passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Block unverified email accounts
    if (user.email_verified === false) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }

    // Log login activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'email_login',
      details: JSON.stringify({ auth_type: 'email' }),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        jurisdiction: user.jurisdiction,
        auth_type: user.auth_type,
      },
    });
  } catch (error) {
    console.error('Email login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Email registration
const emailRegister = async (req, res) => {
  try {
    const { email, password, fullName, role, department, jurisdiction } = req.body;

    // Avoid logging PII (email) in production
    console.log('Email registration request:', { role, department, jurisdiction });

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Email, password, full name, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (role === 'admin') {
      return res
        .status(403)
        .json({ error: 'Administrator registration is not allowed via public registration.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Email address already registered' });
    }

    // Hash password using database function
    const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
      password,
    });

    if (hashError) {
      console.error('Password hashing error:', hashError);
      throw hashError;
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        full_name: fullName,
        role: role,
        department: department || 'General',
        jurisdiction: jurisdiction || 'General',
        auth_type: 'email',
        account_type: 'real',
        created_by: 'self_registration',
        is_active: true,
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: tokenExpires,
      })
      .select()
      .single();

    if (error) {
      console.error('User creation error:', error);
      throw error;
    }

    console.log('User created successfully:', newUser.id);

    // Log registration activity
    await supabase.from('activity_logs').insert({
      user_id: newUser.id,
      action: 'email_registration',
      details: JSON.stringify({
        role: role,
        auth_type: 'email',
        department: department || 'General',
      }),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Registration successful — please verify your email before logging in.',
      email_verification_required: true,
      email_verified: false,
      instructions:
        'A verification link has been generated. Email delivery is not yet configured; contact an administrator to activate your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        jurisdiction: newUser.jurisdiction,
        auth_type: newUser.auth_type,
      },
    });
  } catch (error) {
    console.error('Email registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
};

// Wallet registration
const walletRegister = async (req, res) => {
  try {
    const { walletAddress, fullName, role, department, jurisdiction, badgeNumber } = req.body;

    console.log('Wallet registration request:', {
      role,
      department,
      jurisdiction,
      walletSuffix: walletAddress?.slice(-6),
    });

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!validateWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    if (!fullName || !role) {
      return res.status(400).json({ error: 'Full name and role are required' });
    }

    if (role === 'admin') {
      return res
        .status(403)
        .json({ error: 'Administrator registration is not allowed via public registration.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    // Check if wallet already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Wallet address already registered' });
    }

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        full_name: fullName,
        role: role,
        department: department || 'General',
        jurisdiction: jurisdiction || 'General',
        badge_number: badgeNumber || '',
        auth_type: 'wallet',
        account_type: 'real',
        created_by: 'self_registration',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Wallet user creation error:', error);
      throw error;
    }

    console.log('Wallet user created successfully:', newUser.id);

    // Log registration activity
    await supabase.from('activity_logs').insert({
      user_id: newUser.id,
      action: 'wallet_registration',
      details: JSON.stringify({
        role: role,
        auth_type: 'wallet',
        department: department || 'General',
      }),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        wallet_address: newUser.wallet_address,
        full_name: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        jurisdiction: newUser.jurisdiction,
        badge_number: newUser.badge_number,
        auth_type: newUser.auth_type,
      },
    });
  } catch (error) {
    console.error('Wallet registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Get user by token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Check expiry
    if (new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Verify email error:', updateError);
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    // Audit log for email verification (isolated so failure doesn't mask success)
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'email_verified',
        details: JSON.stringify({ email: user.email }),
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log email verification:', logError);
    }

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

module.exports = {
  emailLogin,
  emailRegister,
  walletLogin,
  walletRegister,
  verifyEmail,
};
