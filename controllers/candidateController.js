import { User, CandidateProfile, Experience, Education, Project, CandidateRating, JobApplication, ProfileView, Notification, PrivacySetting } from '../models/index.js';
import { Op } from 'sequelize';
import AuditService from '../services/auditService.js';

/**
 * Get all candidates with their basic information
 */
export const getCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 15, search, location, experience, availability } = req.query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = {
      role: 'candidate',
      is_active: true
    };

    // Get privacy settings for all candidates to filter out private profiles
    const privacySettings = await PrivacySetting.findAll({
      where: {
        setting_type: 'profile_visibility',
        is_active: true
      },
      attributes: ['user_id', 'setting_value']
    });

    // Filter out candidates who have set their profile to private
    const privateProfileUserIds = privacySettings
      .filter(setting => !setting.setting_value?.public)
      .map(setting => setting.user_id);

    if (privateProfileUserIds.length > 0) {
      whereConditions.id = {
        [Op.notIn]: privateProfileUserIds
      };
    }

    // Search filter
    if (search) {
      whereConditions[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const candidates = await User.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: true,
          where: {
            ...(location && location !== "All Locations" ? { location: { [Op.iLike]: `%${location}%` } } : {}),
            ...(availability && availability !== "All Availability" ? { availability: availability } : {}),
            ...(experience && experience !== "All Experience" ? getExperienceFilter(experience) : {})
          }
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    // Get unique locations for filters
    const locations = await CandidateProfile.findAll({
      attributes: ['location'],
      where: { 
        location: { [Op.ne]: null },
        is_active: true 
      },
      group: ['location'],
      raw: true
    });

    // Get unique availabilities for filters
    const availabilities = await CandidateProfile.findAll({
      attributes: ['availability'],
      where: { 
        availability: { [Op.ne]: null },
        is_active: true 
      },
      group: ['availability'],
      raw: true
    });

    res.json({
      success: true,
      candidates: candidates.rows.map(candidate => ({
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.candidateProfile?.location,
        availability: candidate.candidateProfile?.availability,
        bio: candidate.candidateProfile?.bio,
        profile_picture_url: candidate.candidateProfile?.profile_picture_url,
        experience_years: candidate.candidateProfile?.experience_years,
        salary_expectation: candidate.candidateProfile?.salary_expectation,
        skills: candidate.candidateProfile?.skills || [],
        created_at: candidate.created_at
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(candidates.count / limit),
        total_candidates: candidates.count,
        per_page: parseInt(limit)
      },
      filters: {
        locations: locations.map(l => l.location).filter(Boolean),
        availabilities: availabilities.map(a => a.availability).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates'
    });
  }
};

/**
 * Get a single candidate by ID with detailed information
 */
export const getCandidateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if candidate has set their profile to private (only for non-candidate users)
    if (req.user.id !== id) {
      const privacySetting = await PrivacySetting.findOne({
        where: {
          user_id: id,
          setting_type: 'profile_visibility',
          is_active: true
        }
      });

      if (privacySetting && !privacySetting.setting_value?.public) {
        return res.status(403).json({
          success: false,
          message: 'This candidate has set their profile to private'
        });
      }
    }

    const candidate = await User.findOne({
      where: { 
        id: id,
        role: 'candidate',
        is_active: true 
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: true,
          include: [
            {
              model: Experience,
              as: 'experiences',
              required: false,
              order: [['start_date', 'DESC']]
            },
            {
              model: Education,
              as: 'educations',
              required: false,
              order: [['graduation_year', 'DESC']]
            },
            {
              model: Project,
              as: 'projects',
              required: false,
              order: [['created_at', 'DESC']]
            }
          ]
        },
      ]
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Apply privacy settings for non-candidate users
    if (req.user.id !== id) {
      // Check contact info sharing
      const contactPrivacySetting = await PrivacySetting.findOne({
        where: {
          user_id: id,
          setting_type: 'contact_info_sharing',
          is_active: true
        }
      });

      if (contactPrivacySetting && !contactPrivacySetting.setting_value?.enabled) {
        // Remove contact details
        if (candidate.email) candidate.email = '[Contact Restricted]';
        if (candidate.candidateProfile?.phone) candidate.candidateProfile.phone = '[Contact Restricted]';
      }

      // Check anonymization level
      const anonymizationSetting = await PrivacySetting.findOne({
        where: {
          user_id: id,
          setting_type: 'anonymization_level',
          is_active: true
        }
      });

      if (anonymizationSetting) {
        const level = anonymizationSetting.setting_value?.level || 'none';
        
        switch (level) {
          case 'basic':
            if (candidate.candidateProfile?.current_company) {
              candidate.candidateProfile.current_company = '[Company Name Hidden]';
            }
            break;
          case 'advanced':
            if (candidate.candidateProfile?.current_company) {
              candidate.candidateProfile.current_company = '[Company Name Hidden]';
            }
            if (candidate.candidateProfile?.location) {
              candidate.candidateProfile.location = candidate.candidateProfile.location.split(',')[0] + ' Area';
            }
            break;
          case 'maximum':
            if (candidate.candidateProfile?.current_company) {
              candidate.candidateProfile.current_company = '[Company Name Hidden]';
            }
            if (candidate.candidateProfile?.current_title) {
              candidate.candidateProfile.current_title = '[Job Title Hidden]';
            }
            if (candidate.candidateProfile?.location) {
              candidate.candidateProfile.location = '[Location Hidden]';
            }
            break;
        }
      }
    }

    // Log profile view and create notification
    try {
      // Don't log views from the candidate themselves
      if (req.user.id !== id) {
        // Check if we already logged a view from this viewer in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingView = await ProfileView.findOne({
          where: {
            candidate_id: id,
            viewer_id: req.user.id,
            viewed_at: {
              [Op.gte]: fiveMinutesAgo
            }
          }
        });

        if (!existingView) {
          await ProfileView.create({
            candidate_id: id,
            viewer_id: req.user.id,
            viewer_type: req.user.role || 'employer',
            viewer_email: req.user.email,
            viewer_company: req.user.employerProfile?.company_name,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
          });

          // Log profile view in audit log
          await AuditService.logEvent({
            userId: id,
            actionType: 'profile_view',
            actionCategory: 'profile',
            description: `Profile viewed by ${req.user.email}`,
            targetUserId: req.user.id,
            metadata: {
              viewerType: req.user.role || 'employer',
              viewerEmail: req.user.email,
              viewerCompany: req.user.employerProfile?.company_name
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          });

          // Create notification for the candidate about profile view (with cooldown)
          try {
            // Check if we already created a notification for this viewer in the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const existingNotification = await Notification.findOne({
              where: {
                user_id: id,
                type: 'profile_view',
                data: {
                  viewerType: req.user.role || 'employer'
                },
                created_at: {
                  [Op.gte]: fiveMinutesAgo
                }
              }
            });

            if (!existingNotification) {
              const viewerName = req.user.employerProfile?.company_name || req.user.email || 'An employer';
              const companyName = req.user.employerProfile?.company_name || 'a company';
              
              await Notification.create({
                user_id: id,
                type: 'profile_view',
                title: 'Profile Viewed',
                message: `${viewerName} from ${companyName} viewed your profile.`,
                data: {
                  viewerName,
                  companyName,
                  viewerType: req.user.role || 'employer',
                  type: 'profile_view'
                },
                is_read: false
              });
              console.log('✅ Profile view notification created for candidate:', id);
            } else {
              console.log('⏭️ Skipping duplicate profile view notification (within 5 minutes)');
            }
          } catch (notificationError) {
            console.error('❌ Error creating profile view notification:', notificationError);
            // Don't fail the main request if notification creation fails
          }
        } else {
          console.log('⏭️ Skipping duplicate profile view (within 5 minutes)');
        }
      }
    } catch (viewError) {
      console.log('Could not log profile view:', viewError.message);
    }

    // Get ratings for this candidate through job applications
    const ratings = await CandidateRating.findAll({
      include: [
        {
          model: JobApplication,
          as: 'application',
          where: { candidate_id: id },
          required: true
        },
        {
          model: User,
          as: 'rater',
          attributes: ['first_name', 'last_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          email: candidate.email,
          phone: candidate.phone,
          created_at: candidate.created_at,
          candidateProfile: candidate.candidateProfile,
          experiences: candidate.candidateProfile?.experiences || [],
          educations: candidate.candidateProfile?.educations || [],
          projects: candidate.candidateProfile?.projects || [],
          ratings: ratings.map(rating => ({
            id: rating.id,
            rating: rating.overall_rating,
            review: rating.overall_comments,
            reviewer_name: rating.rater ? `${rating.rater.first_name} ${rating.rater.last_name}` : 'Anonymous',
            created_at: rating.created_at
          }))
        }
      }
    });

  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidate profile'
    });
  }
};

/**
 * Get candidate statistics
 */
export const getCandidateStats = async (req, res) => {
  try {
    const totalCandidates = await User.count({
      where: { role: 'candidate', is_active: true }
    });

    const candidatesWithProfiles = await User.count({
      where: { role: 'candidate', is_active: true },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: true
        }
      ]
    });

    const recentlyJoined = await User.count({
      where: { 
        role: 'candidate', 
        is_active: true,
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    res.json({
      success: true,
      stats: {
        total_candidates: totalCandidates,
        candidates_with_profiles: candidatesWithProfiles,
        recently_joined: recentlyJoined,
        profile_completion_rate: totalCandidates > 0 ? (candidatesWithProfiles / totalCandidates * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('Get candidate stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidate statistics'
    });
  }
};

/**
 * Test endpoint for candidates (no authentication required)
 */
export const testCandidates = async (req, res) => {
  try {
    const candidates = await User.findAll({
      where: { role: 'candidate', is_active: true },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: false
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      message: 'Test endpoint working',
      candidates: candidates.map(candidate => ({
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        has_profile: !!candidate.candidateProfile
      }))
    });

  } catch (error) {
    console.error('Test candidates error:', error);
    res.status(500).json({
      success: false,
      error: 'Test endpoint failed'
    });
  }
};

/**
 * Helper function to build experience filter
 */
function getExperienceFilter(experience) {
  switch (experience) {
    case '0-1':
      return { experience_years: { [Op.between]: [0, 1] } };
    case '2-3':
      return { experience_years: { [Op.between]: [2, 3] } };
    case '4-5':
      return { experience_years: { [Op.between]: [4, 5] } };
    case '6-10':
      return { experience_years: { [Op.between]: [6, 10] } };
    case '10+':
      return { experience_years: { [Op.gte]: 10 } };
    default:
      return {};
  }
}