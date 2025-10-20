import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/index.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../config.env') });

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Debug logging
console.log('Google OAuth Config:', {
  GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID ? 'SET' : 'UNDEFINED',
  GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? 'SET' : 'UNDEFINED',
  GOOGLE_REDIRECT_URI: GOOGLE_REDIRECT_URI || 'UNDEFINED'
});

// Exchange authorization code for access token
export const exchangeCodeForToken = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state parameter'
      });
    }

    // Validate environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      console.error('Missing Google OAuth environment variables');
      return res.status(500).json({
        success: false,
        error: 'Google OAuth configuration error'
      });
    }

    // Prepare form data for Google OAuth
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('redirect_uri', GOOGLE_REDIRECT_URI);
    formData.append('client_id', GOOGLE_CLIENT_ID);
    formData.append('client_secret', GOOGLE_CLIENT_SECRET);


    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    res.json({
      success: true,
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in,
      token_type: tokenResponse.data.token_type,
      refresh_token: tokenResponse.data.refresh_token,
      scope: tokenResponse.data.scope
    });

  } catch (error) {
    console.error('Google token exchange error:', error);
    if (error.response) {
      console.error('Google OAuth error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      // Check for specific Google OAuth errors
      if (error.response.data?.error === 'invalid_grant') {
        console.error('Authorization code is invalid, expired, or already used');
      }
    }
    res.status(500).json({
      success: false,
      error: 'Failed to exchange code for token',
      details: error.response?.data || error.message
    });
  }
};

// Fetch Google profile
export const fetchGoogleProfile = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing access token'
      });
    }

    // Fetch user profile from Google
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const profile = profileResponse.data;

    res.json({
      success: true,
      id: profile.id,
      email: profile.email,
      name: profile.name,
      given_name: profile.given_name,
      family_name: profile.family_name,
      picture: profile.picture,
      verified_email: profile.verified_email,
      locale: profile.locale
    });

  } catch (error) {
    console.error('Google profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Google profile'
    });
  }
};

// Authenticate user with Google (login or register)
export const authenticateWithGoogle = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing access token'
      });
    }

    // Fetch user profile from Google
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const googleProfile = profileResponse.data;

    if (!googleProfile.email || !googleProfile.verified_email) {
      return res.status(400).json({
        success: false,
        error: 'Google account email not verified'
      });
    }

    // Check if user already exists
    let user = await User.findOne({
      where: { email: googleProfile.email }
    });

    if (user) {
      // User exists, log them in
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // Update user's Google ID if not set
      if (!user.google_id) {
        await user.update({ google_id: googleProfile.id });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Get user with profiles
      const { EmployerProfile, CandidateProfile } = await import('../models/index.js');
      const userWithProfiles = await User.findByPk(user.id, {
        include: [
          { model: EmployerProfile, as: 'employerProfile', required: false },
          { model: CandidateProfile, as: 'candidateProfile', required: false }
        ]
      });

      res.json({
        success: true,
        user: userWithProfiles.toJSON(),
        token: token,
        message: 'Login successful'
      });

    } else {
      // User doesn't exist, create new account
      const newUser = await User.create({
        email: googleProfile.email,
        first_name: googleProfile.given_name || '',
        last_name: googleProfile.family_name || '',
        google_id: googleProfile.id,
        is_active: true,
        email_verified: true, // Google emails are pre-verified
        role: 'candidate' // Default role for new users
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Get user with profiles (will be empty for new user)
      const { EmployerProfile, CandidateProfile } = await import('../models/index.js');
      const userWithProfiles = await User.findByPk(newUser.id, {
        include: [
          { model: EmployerProfile, as: 'employerProfile', required: false },
          { model: CandidateProfile, as: 'candidateProfile', required: false }
        ]
      });

      res.json({
        success: true,
        user: userWithProfiles.toJSON(),
        token: token,
        message: 'Account created and login successful',
        isNewUser: true
      });
    }

  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google'
    });
  }
};


