import { User, CandidateProfile, Experience, Education, Project, CandidateRating, JobApplication } from '../models/index.js';
import { Op } from 'sequelize';

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