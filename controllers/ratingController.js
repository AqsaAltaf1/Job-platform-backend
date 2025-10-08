import CandidateRating from '../models/CandidateRating.js';
import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import Interview from '../models/Interview.js';

// Create or update a candidate rating
export const createOrUpdateRating = async (req, res) => {
  try {
    const { application_id } = req.params;
    const {
      interview_id,
      technical_skills,
      technical_skills_notes,
      communication_skills,
      communication_skills_notes,
      problem_solving,
      problem_solving_notes,
      cultural_fit,
      cultural_fit_notes,
      experience_qualifications,
      experience_qualifications_notes,
      leadership_potential,
      leadership_potential_notes,
      overall_comments,
      recommendation,
      rating_type,
      custom_criteria,
      status
    } = req.body;

    // Verify application exists and user has permission
    const application = await JobApplication.findByPk(application_id, {
      include: [{
        model: Job,
        as: 'job',
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check permissions
    let hasPermission = false;
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfile.id === application.job.employer_profile_id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: application.job.employer_profile_id,
          is_active: true
        }
      });
      hasPermission = teamMember && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_review_applications
      );
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if rating already exists for this rater and application
    let rating = await CandidateRating.findOne({
      where: {
        application_id,
        rater_id: req.user.id,
        rating_type: rating_type || 'resume_review'
      }
    });

    const ratingData = {
      application_id,
      rater_id: req.user.id,
      interview_id,
      technical_skills,
      technical_skills_notes,
      communication_skills,
      communication_skills_notes,
      problem_solving,
      problem_solving_notes,
      cultural_fit,
      cultural_fit_notes,
      experience_qualifications,
      experience_qualifications_notes,
      leadership_potential,
      leadership_potential_notes,
      overall_comments,
      recommendation,
      rating_type: rating_type || 'resume_review',
      custom_criteria: custom_criteria || {},
      status: status || 'draft'
    };

    if (rating) {
      // Update existing rating
      await rating.update(ratingData);
    } else {
      // Create new rating
      rating = await CandidateRating.create(ratingData);
    }

    // Fetch the complete rating with associations
    const completeRating = await CandidateRating.findByPk(rating.id, {
      include: [
        {
          model: JobApplication,
          as: 'application',
          include: [
            {
              model: Job,
              as: 'job',
              attributes: ['id', 'title']
            },
            {
              model: CandidateProfile,
              as: 'candidateProfile',
              include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email']
              }]
            }
          ]
        },
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Interview,
          as: 'interview',
          required: false
        }
      ]
    });

    res.status(rating ? 200 : 201).json({
      success: true,
      message: rating ? 'Rating updated successfully' : 'Rating created successfully',
      rating: completeRating
    });
  } catch (error) {
    console.error('Create/Update rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save rating'
    });
  }
};

// Get ratings for an application
export const getApplicationRatings = async (req, res) => {
  try {
    const { application_id } = req.params;

    // Verify application exists and user has permission
    const application = await JobApplication.findByPk(application_id, {
      include: [{
        model: Job,
        as: 'job',
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check permissions (same as above)
    let hasPermission = false;
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      hasPermission = employerProfile && employerProfile.id === application.job.employer_profile_id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { 
          user_id: req.user.id,
          employer_profile_id: application.job.employer_profile_id,
          is_active: true
        }
      });
      hasPermission = teamMember && (
        teamMember.role === 'primary_owner' || 
        teamMember.permissions?.can_review_applications
      );
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const ratings = await CandidateRating.findAll({
      where: { application_id },
      include: [
        {
          model: User,
          as: 'rater',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Interview,
          as: 'interview',
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate aggregate ratings
    const aggregateRating = await calculateAggregateRating(application_id);

    res.json({
      success: true,
      ratings,
      aggregate: aggregateRating
    });
  } catch (error) {
    console.error('Get application ratings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ratings'
    });
  }
};

// Get rating analytics for employer
export const getRatingAnalytics = async (req, res) => {
  try {
    const { timeframe = '30' } = req.query;
    const days = parseInt(timeframe);

    // Get employer profile
    let employerProfileId;
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: req.user.id }
      });
      employerProfileId = employerProfile?.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: req.user.id, is_active: true }
      });
      employerProfileId = teamMember?.employer_profile_id;
    }

    if (!employerProfileId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get ratings for employer's applications
    const ratings = await CandidateRating.findAll({
      include: [{
        model: JobApplication,
        as: 'application',
        required: true,
        include: [{
          model: Job,
          as: 'job',
          required: true,
          where: { employer_profile_id: employerProfileId }
        }]
      }],
      where: {
        created_at: {
          $gte: dateFrom
        },
        status: 'submitted'
      }
    });

    // Calculate analytics
    const analytics = {
      totalRatings: ratings.length,
      averageOverallRating: 0,
      ratingDistribution: {
        technical_skills: 0,
        communication_skills: 0,
        problem_solving: 0,
        cultural_fit: 0,
        experience_qualifications: 0,
        leadership_potential: 0
      },
      recommendationBreakdown: {
        strongly_recommend: 0,
        recommend: 0,
        neutral: 0,
        do_not_recommend: 0
      },
      ratingsByType: {
        resume_review: 0,
        phone_screen: 0,
        technical_interview: 0,
        behavioral_interview: 0,
        final_interview: 0
      },
      topPerformers: [],
      ratingTrends: []
    };

    if (ratings.length > 0) {
      // Calculate averages
      const totalOverallRating = ratings
        .filter(r => r.overall_rating)
        .reduce((sum, r) => sum + parseFloat(r.overall_rating), 0);
      
      analytics.averageOverallRating = (totalOverallRating / ratings.filter(r => r.overall_rating).length).toFixed(2);

      // Rating distribution
      const criteria = ['technical_skills', 'communication_skills', 'problem_solving', 'cultural_fit', 'experience_qualifications', 'leadership_potential'];
      criteria.forEach(criterion => {
        const validRatings = ratings.filter(r => r[criterion]);
        if (validRatings.length > 0) {
          analytics.ratingDistribution[criterion] = (
            validRatings.reduce((sum, r) => sum + r[criterion], 0) / validRatings.length
          ).toFixed(2);
        }
      });

      // Recommendation breakdown
      ratings.forEach(rating => {
        if (rating.recommendation) {
          analytics.recommendationBreakdown[rating.recommendation]++;
        }
      });

      // Ratings by type
      ratings.forEach(rating => {
        analytics.ratingsByType[rating.rating_type]++;
      });
    }

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get rating analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rating analytics'
    });
  }
};

// Delete a rating
export const deleteRating = async (req, res) => {
  try {
    const { rating_id } = req.params;

    const rating = await CandidateRating.findByPk(rating_id, {
      include: [{
        model: JobApplication,
        as: 'application',
        include: [{
          model: Job,
          as: 'job',
          include: [{
            model: EmployerProfile,
            as: 'employerProfile'
          }]
        }]
      }]
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    // Check if user can delete this rating (only the rater or admin can delete)
    if (rating.rater_id !== req.user.id) {
      // Check if user is admin/primary owner
      let hasPermission = false;
      if (req.user.role === 'employer') {
        const employerProfile = await EmployerProfile.findOne({
          where: { user_id: req.user.id }
        });
        hasPermission = employerProfile && employerProfile.id === rating.application.job.employer_profile_id;
      } else if (req.user.role === 'team_member') {
        const teamMember = await TeamMember.findOne({
          where: { 
            user_id: req.user.id,
            employer_profile_id: rating.application.job.employer_profile_id,
            is_active: true
          }
        });
        hasPermission = teamMember && teamMember.role === 'primary_owner';
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    await rating.destroy();

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete rating'
    });
  }
};

// Helper function to calculate aggregate rating
async function calculateAggregateRating(applicationId) {
  const ratings = await CandidateRating.findAll({
    where: { 
      application_id: applicationId,
      status: 'submitted'
    }
  });

  if (ratings.length === 0) {
    return null;
  }

  const criteria = ['technical_skills', 'communication_skills', 'problem_solving', 'cultural_fit', 'experience_qualifications', 'leadership_potential'];
  const aggregate = {
    total_ratings: ratings.length,
    overall_average: 0,
    criteria_averages: {},
    recommendation_summary: {
      strongly_recommend: 0,
      recommend: 0,
      neutral: 0,
      do_not_recommend: 0
    }
  };

  // Calculate criteria averages
  criteria.forEach(criterion => {
    const validRatings = ratings.filter(r => r[criterion] !== null);
    if (validRatings.length > 0) {
      aggregate.criteria_averages[criterion] = (
        validRatings.reduce((sum, r) => sum + r[criterion], 0) / validRatings.length
      ).toFixed(2);
    }
  });

  // Calculate overall average
  const overallRatings = ratings.filter(r => r.overall_rating);
  if (overallRatings.length > 0) {
    aggregate.overall_average = (
      overallRatings.reduce((sum, r) => sum + parseFloat(r.overall_rating), 0) / overallRatings.length
    ).toFixed(2);
  }

  // Recommendation summary
  ratings.forEach(rating => {
    if (rating.recommendation) {
      aggregate.recommendation_summary[rating.recommendation]++;
    }
  });

  return aggregate;
}
