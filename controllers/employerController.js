import { User, CandidateProfile, Reference, VerifiedEmployment, ProfileView, Notification, PrivacySetting, Experience, Education, Project } from '../models/index.js';
import { Op } from 'sequelize';
import AuditService from '../services/auditService.js';

// Get candidates for employer search
export const getCandidatesForSearch = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      jobType,
      industry,
      location,
      minRating,
      maxRating,
      minExperience,
      maxExperience,
      verifiedOnly
    } = req.query;

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
    
    console.log('🔍 Basic where conditions:', whereConditions);

    // First, let's check if there are any candidate users at all
    const totalCandidates = await User.count({
      where: { role: 'candidate' }
    });
    console.log('🔍 Total candidates in database:', totalCandidates);

    // Search conditions
    if (search) {
      whereConditions[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Include candidate profile conditions
    const profileWhereConditions = {};
    if (jobType) {
      profileWhereConditions.job_type_preference = jobType;
    }
    if (industry) {
      profileWhereConditions.industry = industry;
    }
    if (location) {
      profileWhereConditions.location = { [Op.iLike]: `%${location}%` };
    }
    if (minExperience !== undefined || maxExperience !== undefined) {
      profileWhereConditions.experience_years = {};
      if (minExperience !== undefined) {
        profileWhereConditions.experience_years[Op.gte] = parseInt(minExperience);
      }
      if (maxExperience !== undefined) {
        profileWhereConditions.experience_years[Op.lte] = parseInt(maxExperience);
      }
    }

    // Build include conditions
    const includeConditions = [
      {
        model: CandidateProfile,
        as: 'candidateProfile',
        where: Object.keys(profileWhereConditions).length > 0 ? profileWhereConditions : undefined,
        required: Object.keys(profileWhereConditions).length > 0,
        include: [
          {
            model: VerifiedEmployment,
            as: 'verifiedEmployments',
            required: false
          }
        ]
      },
      {
        model: Reference,
        as: 'references',
        where: { is_public: true },
        required: false
      }
    ];

    // If verified only is requested, we need to ensure they have verified references or employment
    if (verifiedOnly === 'true') {
      includeConditions.push({
        model: Reference,
        as: 'verifiedReferences',
        where: { is_verified: true, is_public: true },
        required: false
      });
    }

    // Get candidates - first try a simple query
    console.log('🔍 Fetching candidates with conditions:', whereConditions);
    console.log('🔍 Include conditions:', JSON.stringify(includeConditions, null, 2));
    
    // Try a simple query first to see if we get any results
    const simpleCandidates = await User.findAll({
      where: whereConditions,
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    console.log('🔍 Simple query found:', simpleCandidates.length, 'candidates');
    
    const candidates = await User.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });
    
    console.log('📊 Found candidates:', candidates.count, 'total');
    console.log('📊 Candidates data:', candidates.rows.length, 'returned');

    // Filter by rating if specified
    let filteredCandidates = candidates.rows;
    if (minRating !== undefined || maxRating !== undefined) {
      filteredCandidates = candidates.rows.filter(candidate => {
        if (!candidate.references || candidate.references.length === 0) return false;
        
        const avgRating = candidate.references.reduce((sum, ref) => sum + ref.overall_rating, 0) / candidate.references.length;
        
        if (minRating !== undefined && avgRating < parseFloat(minRating)) return false;
        if (maxRating !== undefined && avgRating > parseFloat(maxRating)) return false;
        
        return true;
      });
    }

    // If verified only, filter candidates who have verified references or employment
    if (verifiedOnly === 'true') {
      filteredCandidates = filteredCandidates.filter(candidate => {
        const hasVerifiedReferences = candidate.references?.some(ref => ref.is_verified);
        const hasVerifiedEmployment = candidate.verifiedEmployments?.some(emp => emp.verification_status === 'VERIFIED');
        return hasVerifiedReferences || hasVerifiedEmployment;
      });
    }

    // Get profile view counts for each candidate
    const candidateIds = filteredCandidates.map(c => c.id);
    const profileViews = await ProfileView.findAll({
      where: {
        candidate_id: { [Op.in]: candidateIds }
      },
      attributes: [
        'candidate_id',
        [ProfileView.sequelize.fn('COUNT', ProfileView.sequelize.col('id')), 'view_count']
      ],
      group: ['candidate_id']
    });

    const viewCountMap = profileViews.reduce((acc, view) => {
      acc[view.candidate_id] = parseInt(view.dataValues.view_count);
      return acc;
    }, {});

    // Format response
    const formattedCandidates = filteredCandidates.map(candidate => {
      const avgRating = candidate.references && candidate.references.length > 0
        ? candidate.references.reduce((sum, ref) => sum + ref.overall_rating, 0) / candidate.references.length
        : 0;

      return {
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        location: candidate.candidateProfile?.location,
        profile_picture: candidate.candidateProfile?.profile_picture,
        created_at: candidate.created_at,
        candidate_profile: {
          bio: candidate.candidateProfile?.bio,
          skills: candidate.candidateProfile?.skills || [],
          experience_years: candidate.candidateProfile?.experience_years,
          current_title: candidate.candidateProfile?.current_title,
          current_company: candidate.candidateProfile?.current_company,
          industry: candidate.candidateProfile?.industry,
          job_type_preference: candidate.candidateProfile?.job_type_preference,
          availability: candidate.candidateProfile?.availability,
          salary_expectation: candidate.candidateProfile?.salary_expectation
        },
        references: candidate.references?.map(ref => ({
          id: ref.id,
          reviewer_name: ref.reviewer_name,
          overall_rating: ref.overall_rating,
          work_quality_rating: ref.work_quality_rating,
          communication_rating: ref.communication_rating,
          reliability_rating: ref.reliability_rating,
          teamwork_rating: ref.teamwork_rating,
          reference_text: ref.reference_text,
          strengths: ref.strengths,
          would_recommend: ref.would_recommend,
          would_hire_again: ref.would_hire_again,
          is_public: ref.is_public,
          is_verified: ref.is_verified,
          created_at: ref.created_at
        })) || [],
        verified_employments: candidate.candidateProfile?.verifiedEmployments?.map(emp => ({
          id: emp.id,
          company_name: emp.company_name,
          title: emp.title,
          start_date: emp.start_date,
          end_date: emp.end_date,
          verification_status: emp.verification_status,
          verified_at: emp.verified_at
        })) || [],
        profile_views: viewCountMap[candidate.id] || 0,
        last_active: candidate.updated_at,
        average_rating: avgRating
      };
    });

    console.log('📤 Returning formatted candidates:', formattedCandidates.length);
    console.log('📤 Sample candidate:', formattedCandidates[0] ? {
      id: formattedCandidates[0].id,
      name: `${formattedCandidates[0].first_name} ${formattedCandidates[0].last_name}`,
      hasProfile: !!formattedCandidates[0].candidate_profile,
      hasReferences: formattedCandidates[0].references?.length || 0,
      hasVerifiedEmployment: formattedCandidates[0].verified_employments?.length || 0
    } : 'No candidates');

    res.json({
      success: true,
      data: formattedCandidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: candidates.count,
        pages: Math.ceil(candidates.count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching candidates for search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidates',
      error: error.message
    });
  }
};

// Get candidate profile details for employer view
export const getCandidateProfileForEmployer = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Check if candidate has set their profile to private
    const privacySetting = await PrivacySetting.findOne({
      where: {
        user_id: candidateId,
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

    const candidate = await User.findOne({
      where: { 
        id: candidateId,
        role: 'candidate',
        is_active: true
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [
            {
              model: VerifiedEmployment,
              as: 'verifiedEmployments',
              required: false
            },
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
        {
          model: Reference,
          as: 'references',
          required: false
        }
      ]
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if candidate has set their references to private
    const referencePrivacySetting = await PrivacySetting.findOne({
      where: {
        user_id: candidateId,
        setting_type: 'reference_visibility',
        is_active: true
      }
    });

    console.log('🔍 Reference privacy setting:', referencePrivacySetting ? {
      exists: true,
      public: referencePrivacySetting.setting_value?.public,
      setting_value: referencePrivacySetting.setting_value
    } : { exists: false });

    // If references are set to private, remove them from the response
    // Default behavior: references are visible unless explicitly set to private
    if (referencePrivacySetting && referencePrivacySetting.setting_value?.public === false) {
      console.log('🔒 Hiding references - privacy setting set to private');
      candidate.references = [];
    } else {
      console.log('✅ Showing references - privacy setting allows or no setting exists');
    }

    // Check contact info sharing setting
    const contactPrivacySetting = await PrivacySetting.findOne({
      where: {
        user_id: candidateId,
        setting_type: 'contact_info_sharing',
        is_active: true
      }
    });

    console.log('📧 Contact info privacy setting:', contactPrivacySetting ? {
      exists: true,
      enabled: contactPrivacySetting.setting_value?.enabled,
      setting_value: contactPrivacySetting.setting_value
    } : { exists: false });

    // If contact info sharing is disabled, remove contact details
    // Default behavior: contact info is visible unless explicitly disabled
    if (contactPrivacySetting && contactPrivacySetting.setting_value?.enabled === false) {
      console.log('🔒 Hiding contact info - privacy setting set to disabled');
      // Remove email and phone from response
      if (candidate.email) candidate.email = '[Contact Restricted]';
      if (candidate.candidateProfile?.phone) candidate.candidateProfile.phone = '[Contact Restricted]';
    } else {
      console.log('✅ Showing contact info - privacy setting allows or no setting exists');
    }

    // Check anonymization level
    const anonymizationSetting = await PrivacySetting.findOne({
      where: {
        user_id: candidateId,
        setting_type: 'anonymization_level',
        is_active: true
      }
    });

    // Apply anonymization based on level
    if (anonymizationSetting) {
      const level = anonymizationSetting.setting_value?.level || 'none';
      
      switch (level) {
        case 'basic':
          // Anonymize company names and specific locations
          if (candidate.candidateProfile?.current_company) {
            candidate.candidateProfile.current_company = '[Company Name Hidden]';
          }
          break;
        case 'advanced':
          // Anonymize more details
          if (candidate.candidateProfile?.current_company) {
            candidate.candidateProfile.current_company = '[Company Name Hidden]';
          }
          if (candidate.candidateProfile?.location) {
            candidate.candidateProfile.location = candidate.candidateProfile.location.split(',')[0] + ' Area';
          }
          break;
        case 'maximum':
          // Maximum anonymization
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

    // Log profile view
    try {
      // Check if we already logged a view from this viewer in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const existingView = await ProfileView.findOne({
            where: {
              candidate_id: candidateId,
              viewer_id: req.user.id,
              viewed_at: {
                [Op.gte]: fiveMinutesAgo
              }
            }
          });

      if (!existingView) {
        await ProfileView.create({
          candidate_id: candidateId,
          viewer_id: req.user.id,
          viewer_type: 'employer',
          viewer_email: req.user.email,
          viewer_company: req.user.employerProfile?.company_name,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent')
        });

        // Log profile view in audit log
        await AuditService.logEvent({
          userId: candidateId,
          actionType: 'profile_view',
          actionCategory: 'profile',
          description: `Profile viewed by employer ${req.user.email}`,
          targetUserId: req.user.id,
          metadata: {
            viewerType: 'employer',
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
              user_id: candidateId,
              type: 'profile_view',
              data: {
                viewerType: 'employer'
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
              user_id: candidateId,
              type: 'profile_view',
              title: 'Profile Viewed',
              message: `${viewerName} from ${companyName} viewed your profile.`,
              data: {
                viewerName,
                companyName,
                viewerType: 'employer',
                type: 'profile_view'
              },
              is_read: false
            });
            console.log('✅ Profile view notification created for candidate:', candidateId);
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
    } catch (viewError) {
      console.log('Could not log profile view:', viewError.message);
    }

    // Calculate average rating
    const avgRating = candidate.references && candidate.references.length > 0
      ? candidate.references.reduce((sum, ref) => sum + ref.overall_rating, 0) / candidate.references.length
      : 0;

    // Get profile view count
    const viewCount = await ProfileView.count({
      where: { candidate_id: candidateId }
    });

    const formattedCandidate = {
      id: candidate.id,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      location: candidate.candidateProfile?.location,
      profile_picture: candidate.candidateProfile?.profile_picture,
      created_at: candidate.created_at,
      candidate_profile: {
        bio: candidate.candidateProfile?.bio,
        skills: candidate.candidateProfile?.skills || [],
        experience_years: candidate.candidateProfile?.experience_years,
        current_title: candidate.candidateProfile?.current_title,
        current_company: candidate.candidateProfile?.current_company,
        industry: candidate.candidateProfile?.industry,
        job_type_preference: candidate.candidateProfile?.job_type_preference,
        availability: candidate.candidateProfile?.availability,
        salary_expectation: candidate.candidateProfile?.salary_expectation,
        portfolio_items: candidate.candidateProfile?.portfolio_items || [],
        work_samples: candidate.candidateProfile?.work_samples || []
      },
      experiences: candidate.candidateProfile?.experiences?.map(exp => ({
        id: exp.id,
        company_name: exp.company_name,
        title: exp.title,
        employment_type: exp.employment_type,
        start_date: exp.start_date,
        end_date: exp.end_date,
        current: exp.current,
        description: exp.description,
        location: exp.location,
        achievements: exp.achievements
      })) || [],
      educations: candidate.candidateProfile?.educations?.map(edu => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        graduation_year: edu.graduation_year,
        gpa: edu.gpa,
        description: edu.description,
        activities: edu.activities
      })) || [],
      projects: candidate.candidateProfile?.projects?.map(proj => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        start_date: proj.start_date,
        end_date: proj.end_date,
        url: proj.url,
        github_url: proj.github_url,
        achievements: proj.achievements
      })) || [],
      references: candidate.references?.map(ref => ({
        id: ref.id,
        reviewer_name: ref.reviewer_name,
        relationship: ref.relationship,
        relationship_description: ref.relationship_description,
        overall_rating: ref.overall_rating,
        work_quality_rating: ref.work_quality_rating,
        communication_rating: ref.communication_rating,
        reliability_rating: ref.reliability_rating,
        teamwork_rating: ref.teamwork_rating,
        reference_text: ref.reference_text,
        strengths: ref.strengths,
        areas_for_improvement: ref.areas_for_improvement,
        would_recommend: ref.would_recommend,
        would_hire_again: ref.would_hire_again,
        years_worked_together: ref.years_worked_together,
        last_worked_together: ref.last_worked_together,
        is_public: ref.is_public,
        is_verified: ref.is_verified,
        created_at: ref.created_at
      })) || [],
      verified_employments: candidate.candidateProfile?.verifiedEmployments?.map(emp => ({
        id: emp.id,
        company_name: emp.company_name,
        title: emp.title,
        employment_type: emp.employment_type,
        start_date: emp.start_date,
        end_date: emp.end_date,
        responsibilities: emp.responsibilities,
        verification_status: emp.verification_status,
        verification_method: emp.verification_method,
        verifier_name: emp.verifier_name,
        verified_at: emp.verified_at
      })) || [],
      profile_views: viewCount,
      last_active: candidate.updated_at,
      average_rating: avgRating
    };

    res.json({
      success: true,
      data: formattedCandidate
    });

  } catch (error) {
    console.error('Error fetching candidate profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidate profile',
      error: error.message
    });
  }
};

// Get employer dashboard statistics
export const getEmployerDashboardStats = async (req, res) => {
  try {
    // Get total candidates
    const totalCandidates = await User.count({
      where: { role: 'candidate', is_active: true }
    });

    // Get verified candidates (those with verified references or employment)
    const verifiedCandidates = await User.count({
      where: { role: 'candidate', is_active: true },
      include: [
        {
          model: Reference,
          as: 'references',
          where: { is_verified: true, is_public: true },
          required: false
        },
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          include: [
            {
              model: VerifiedEmployment,
              as: 'verifiedEmployments',
              where: { verification_status: 'VERIFIED' },
              required: false
            }
          ],
          required: false
        }
      ],
      distinct: true
    });

    // Get average rating
    const ratingResult = await Reference.findOne({
      attributes: [
        [Reference.sequelize.fn('AVG', Reference.sequelize.col('overall_rating')), 'avg_rating']
      ],
      where: { is_public: true }
    });
    const avgRating = parseFloat(ratingResult?.dataValues?.avg_rating || 0);

    // Get top skills
    const skillsResult = await CandidateProfile.findAll({
      attributes: [
        'skills',
        [CandidateProfile.sequelize.fn('COUNT', CandidateProfile.sequelize.col('id')), 'count']
      ],
      where: {
        skills: { [Op.ne]: null }
      },
      group: ['skills'],
      order: [[CandidateProfile.sequelize.fn('COUNT', CandidateProfile.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    const topSkills = skillsResult.map(result => {
      const skills = result.skills || [];
      return skills.map(skill => ({
        skill: skill,
        count: parseInt(result.dataValues.count)
      }));
    }).flat().reduce((acc, item) => {
      const existing = acc.find(s => s.skill === item.skill);
      if (existing) {
        existing.count += item.count;
      } else {
        acc.push(item);
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 10);

    // Get industry breakdown
    const industryResult = await CandidateProfile.findAll({
      attributes: [
        'industry',
        [CandidateProfile.sequelize.fn('COUNT', CandidateProfile.sequelize.col('id')), 'count']
      ],
      where: {
        industry: { [Op.ne]: null }
      },
      group: ['industry'],
      order: [[CandidateProfile.sequelize.fn('COUNT', CandidateProfile.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    const industryBreakdown = industryResult.map(result => ({
      industry: result.industry,
      count: parseInt(result.dataValues.count)
    }));

    // Calculate compliance alerts (candidates with low verification scores)
    const complianceAlerts = await User.count({
      where: { role: 'candidate', is_active: true },
      include: [
        {
          model: Reference,
          as: 'references',
          where: { is_verified: false },
          required: true
        }
      ],
      distinct: true
    });

    res.json({
      success: true,
      data: {
        total_candidates: totalCandidates,
        verified_candidates: verifiedCandidates,
        avg_rating: avgRating,
        top_skills: topSkills,
        industry_breakdown: industryBreakdown,
        compliance_alerts: complianceAlerts
      }
    });

  } catch (error) {
    console.error('Error fetching employer dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Simple test endpoint to check candidates
export const testEmployerCandidates = async (req, res) => {
  try {
    console.log('🧪 Testing candidates endpoint...');
    
    // Get all users with candidate role
    const allCandidates = await User.findAll({
      where: { role: 'candidate' },
      attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'is_active'],
      limit: 10
    });
    
    console.log('🧪 Found candidates:', allCandidates.length);
    console.log('🧪 Sample candidates:', allCandidates.map(c => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
      role: c.role,
      is_active: c.is_active
    })));
    
    res.json({
      success: true,
      data: allCandidates,
      message: `Found ${allCandidates.length} candidates`
    });
    
  } catch (error) {
    console.error('🧪 Test candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};
