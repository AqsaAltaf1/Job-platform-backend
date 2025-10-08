import { User, EmployerProfile, CandidateProfile, Experience, Education, Otp } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';
import OtpService from '../services/otpService.js';

// Register new user with OTP verification
export const register = async (req, res) => {
  try {
    const { email, password, role, first_name, last_name, phone, otp } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Verify OTP if provided
    if (otp) {
      const otpResult = await OtpService.verifyOtp(email, otp);
      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          error: otpResult.error
        });
      }
    } else {
      // If no OTP provided, send OTP instead of registering
      const otpResult = await OtpService.createAndSendOtp(email);
      if (otpResult.success) {
        return res.status(200).json({
          success: true,
          message: 'OTP sent to your email. Please verify your email to complete registration.',
          requiresOtp: true,
          expiresAt: otpResult.expiresAt
        });
      } else {
        return res.status(400).json({
          success: false,
          error: otpResult.error
        });
      }
    }

    // Create new user (only if OTP is verified)
    const user = await User.create({
      email,
      password_hash: password, // Will be hashed by the model hook
      role: role || 'candidate',
      first_name,
      last_name,
      phone,
      is_verified: true // User is verified after successful OTP verification
    });

    // Create appropriate profile based on user role
    let profile = null;
    if (user.role === 'employer') {
      profile = await EmployerProfile.create({
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || null,
        // All other fields will be null initially
      });
    } else if (user.role === 'candidate') {
      profile = await CandidateProfile.create({
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || null,
        // All other fields will be null initially
      });
    }

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered and verified successfully',
      user: user.toJSON(),
      profile: profile ? profile.toJSON() : null,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email before logging in. Check your email for verification instructions.'
      });
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

// Get all users (Super Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update data if present (use separate endpoint for password change)
    delete updateData.password_hash;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user can update this profile
    if (req.user.role !== 'super_admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own profile'
      });
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only super admin can delete users
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admin can delete users'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    console.log('Getting profile for user ID:', req.user.id);
    
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: EmployerProfile,
          as: 'employerProfile',
          required: false
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: false,
          include: [
            {
              model: Experience,
              as: 'experiences',
              required: false
            },
            {
              model: Education,
              as: 'educations',
              required: false
            }
          ]
        }
      ]
    });

    console.log('User found:', {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      hasEmployerProfile: !!user?.employerProfile,
      hasCandidateProfile: !!user?.candidateProfile,
      experiencesCount: user?.candidateProfile?.experiences?.length || 0,
      educationsCount: user?.candidateProfile?.educations?.length || 0,
      candidateProfile: user?.candidateProfile
    });

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// Get user profile by ID
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      include: [
        {
          model: EmployerProfile,
          as: 'employerProfile',
          required: false
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: false
        }
      ],
      attributes: ['id', 'email', 'role', 'first_name', 'last_name']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.email; // Email should be updated through user table
    delete updateData.created_at;
    delete updateData.updated_at;

    // Get user to determine role
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let updatedProfile = null;
    let updatedRowsCount = 0;

    // Update appropriate profile based on user role
    if (user.role === 'employer') {
      [updatedRowsCount] = await EmployerProfile.update(updateData, {
        where: { user_id: userId }
      });
      if (updatedRowsCount > 0) {
        updatedProfile = await EmployerProfile.findOne({
          where: { user_id: userId }
        });
      }
    } else if (user.role === 'candidate') {
      [updatedRowsCount] = await CandidateProfile.update(updateData, {
        where: { user_id: userId }
      });
      if (updatedRowsCount > 0) {
        updatedProfile = await CandidateProfile.findOne({
          where: { user_id: userId }
        });
      }
    }

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// Get all user profiles (for admin)
export const getAllUserProfiles = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: EmployerProfile,
          as: 'employerProfile',
          required: false
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      users: users.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Get all profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profiles'
    });
  }
};
