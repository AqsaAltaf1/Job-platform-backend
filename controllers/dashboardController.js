import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { TeamMember } from '../models/TeamMember.js';
import { CandidateProfile } from '../models/CandidateProfile.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

// Get dashboard statistics for employer
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    let employerProfileId;

    // Get employer profile ID
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: userId }
      });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      employerProfileId = employerProfile.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: userId },
        include: [{
          model: EmployerProfile,
          as: 'employerProfile'
        }]
      });
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member profile not found'
        });
      }
      employerProfileId = teamMember.employer_profile_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get job statistics
    const totalJobs = await Job.count({
      where: { employer_profile_id: employerProfileId }
    });

    const activeJobs = await Job.count({
      where: { 
        employer_profile_id: employerProfileId,
        status: 'active'
      }
    });

    // Get application statistics
    const jobIds = await Job.findAll({
      where: { employer_profile_id: employerProfileId },
      attributes: ['id']
    }).then(jobs => jobs.map(job => job.id));

    const totalApplications = await JobApplication.count({
      where: { job_id: { [Op.in]: jobIds } }
    });

    const pendingApplications = await JobApplication.count({
      where: { 
        job_id: { [Op.in]: jobIds },
        status: 'pending'
      }
    });

    const shortlistedApplications = await JobApplication.count({
      where: { 
        job_id: { [Op.in]: jobIds },
        status: 'shortlisted'
      }
    });

    const hiredCandidates = await JobApplication.count({
      where: { 
        job_id: { [Op.in]: jobIds },
        status: 'hired'
      }
    });

    // Get team member count
    const teamMembers = await TeamMember.count({
      where: { employer_profile_id: employerProfileId }
    });

    // Get total job views
    const jobViews = await Job.sum('views_count', {
      where: { employer_profile_id: employerProfileId }
    }) || 0;

    const stats = {
      totalJobs,
      activeJobs,
      totalApplications,
      pendingApplications,
      shortlistedApplications,
      hiredCandidates,
      teamMembers: teamMembers + 1, // +1 for the employer
      jobViews
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Get recent applications for employer
export const getRecentApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    let employerProfileId;

    // Get employer profile ID
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: userId }
      });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      employerProfileId = employerProfile.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: userId }
      });
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member profile not found'
        });
      }
      employerProfileId = teamMember.employer_profile_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const applications = await JobApplication.findAll({
      include: [
        {
          model: Job,
          as: 'job',
          where: { employer_profile_id: employerProfileId },
          attributes: ['id', 'title']
        },
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'email', 'first_name', 'last_name'],
          include: [{
            model: CandidateProfile,
            as: 'candidateProfile',
            attributes: ['id', 'phone', 'location']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    const formattedApplications = applications.map(app => ({
      id: app.id,
      candidate_name: `${app.candidate.first_name} ${app.candidate.last_name}`,
      candidate_email: app.candidate.email,
      job_title: app.job.title,
      job_id: app.job.id,
      status: app.status,
      applied_at: app.created_at,
      rating: app.rating,
      expected_salary: app.expected_salary
    }));

    res.json({
      success: true,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching recent applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent applications',
      error: error.message
    });
  }
};

// Get recent jobs for employer
export const getRecentJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    let employerProfileId;

    // Get employer profile ID
    if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({
        where: { user_id: userId }
      });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      employerProfileId = employerProfile.id;
    } else if (req.user.role === 'team_member') {
      const teamMember = await TeamMember.findOne({
        where: { user_id: userId }
      });
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member profile not found'
        });
      }
      employerProfileId = teamMember.employer_profile_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const jobs = await Job.findAll({
      where: { employer_profile_id: employerProfileId },
      attributes: [
        'id', 'title', 'status', 'applications_count', 'views_count', 
        'created_at', 'job_type', 'location'
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    res.json({
      success: true,
      jobs
    });

  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent jobs',
      error: error.message
    });
  }
};
