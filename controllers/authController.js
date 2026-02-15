const { supabase, allowedRoles } = require('../config');
const { validateWalletAddress } = require('../middleware/verifyAdmin');

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
      user_id: user.wallet_address,
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

    // Log login activity
    await supabase.from('activity_logs').insert({
      user_id: user.email,
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

    console.log('Email registration request:', { role, department, jurisdiction });

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Email, password, full name, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    if (role === 'admin') {
      return res
        .status(400)
        .json({ error: 'Admin role cannot be assigned during self-registration.' });
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
        is_active: true,
        // TODO: Implement proper email verification flow (send token, verify endpoint).
        // Currently setting strict email_verified=false to enforce verification logic in the future.
        email_verified: false,
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
      user_id: newUser.email,
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
      message: 'Registration successful',
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
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Wallet registration
const walletRegister = async (req, res) => {
  try {
    const { walletAddress, fullName, role, department, jurisdiction, badgeNumber } = req.body;

    console.log('Wallet registration request:', { role, department, jurisdiction });

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!validateWalletAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    if (!fullName || !role) {
      return res.status(400).json({ error: 'Full name and role are required' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    if (role === 'admin') {
      return res
        .status(400)
        .json({ error: 'Admin role cannot be assigned during self-registration.' });
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
      user_id: newUser.wallet_address,
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
    res.status(500).json({ error: 'Registration failed' });
  }
};

module.exports = {
  emailLogin,
  emailRegister,
  walletLogin,
  walletRegister,
};
