import axios from 'axios';
import { EnhancedSkill } from '../models/EnhancedSkill.js';

// LinkedIn API configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

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

    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    res.json({
      success: true,
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in,
      token_type: tokenResponse.data.token_type
    });

  } catch (error) {
    console.error('LinkedIn token exchange error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange code for token'
    });
  }
};

// Fetch LinkedIn profile and skills
export const fetchLinkedInProfile = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing access token'
      });
    }

    // Fetch basic profile information
    const profileResponse = await axios.get('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      params: {
        projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))'
      }
    });

    const profile = profileResponse.data;
    let skills = [];
    let transformedSkills = [];

    // Try to fetch skills (may fail if scope not authorized)
    try {
      const skillsResponse = await axios.get('https://api.linkedin.com/v2/people/~/skills', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      skills = skillsResponse.data.elements || [];
      
      // Transform skills data
      transformedSkills = skills.map(skill => ({
        name: skill.name,
        category: 'LinkedIn Import',
        endorsements: skill.endorsementCount || 0,
        verified: true
      }));
    } catch (skillsError) {
      console.log('Skills API not available:', skillsError.message);
      // Skills API not available - return empty skills array
      transformedSkills = [];
    }

    res.json({
      success: true,
      id: profile.id,
      firstName: profile.firstName?.localized?.en_US || '',
      lastName: profile.lastName?.localized?.en_US || '',
      email: '', // LinkedIn doesn't provide email in basic profile (r_emailaddress scope not authorized)
      profilePicture: profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier || '',
      skills: transformedSkills
    });

  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LinkedIn profile'
    });
  }
};

// Import LinkedIn skills to candidate profile
export const importLinkedInSkills = async (req, res) => {
  try {
    const { accessToken, candidateId } = req.body;

    if (!accessToken || !candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing access token or candidate ID'
      });
    }

    // Try to fetch LinkedIn skills (may not be available due to scope limitations)
    let linkedinSkills = [];
    try {
      const skillsResponse = await axios.get('https://api.linkedin.com/v2/people/~/skills', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      linkedinSkills = skillsResponse.data.elements || [];
    } catch (skillsError) {
      console.log('Skills API not available for import:', skillsError.message);
      return res.json({
        success: false,
        error: 'LinkedIn skills API is not available. Your LinkedIn app may not have the necessary permissions to access skills data.',
        importedCount: 0,
        errors: ['Skills API access denied']
      });
    }
    const importedSkills = [];
    const errors = [];

    // Import each skill to the database
    for (const linkedinSkill of linkedinSkills) {
      try {
        // Check if skill already exists for this candidate
        const existingSkill = await EnhancedSkill.findOne({
          where: {
            candidate_id: candidateId,
            name: linkedinSkill.name
          }
        });

        if (existingSkill) {
          // Update existing skill with LinkedIn verification
          await existingSkill.update({
            taxonomy_source: 'linkedin',
            skill_rating: linkedinSkill.endorsementCount || 0,
            verified: true,
            updated_at: new Date()
          });
          importedSkills.push(existingSkill);
        } else {
          // Create new skill
          const newSkill = await EnhancedSkill.create({
            candidate_id: candidateId,
            name: linkedinSkill.name,
            category: 'LinkedIn Import',
            taxonomy_source: 'linkedin',
            level: 'intermediate', // Default level for LinkedIn skills
            years_experience: 0, // LinkedIn doesn't provide this
            skill_rating: linkedinSkill.endorsementCount || 0,
            verified: true,
            is_active: true
          });
          importedSkills.push(newSkill);
        }
      } catch (skillError) {
        console.error(`Error importing skill ${linkedinSkill.name}:`, skillError);
        errors.push(`Failed to import skill: ${linkedinSkill.name}`);
      }
    }

    res.json({
      success: true,
      importedCount: importedSkills.length,
      errors: errors
    });

  } catch (error) {
    console.error('LinkedIn skills import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import LinkedIn skills'
    });
  }
};
