import Subscription from '../models/Subscription.js';
import { Op } from 'sequelize';

/**
 * Check if a user has an active subscription
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user has active subscription
 */
export const hasActiveSubscription = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        user_id: userId,
        status: {
          [Op.in]: ['active', 'trialing', 'past_due']
        }
      }
    });
    
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Get user's active subscription details
 * @param {string} userId - The user ID to check
 * @returns {Promise<Object|null>} - Subscription object or null
 */
export const getActiveSubscription = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        user_id: userId,
        status: {
          [Op.in]: ['active', 'trialing', 'past_due']
        }
      },
      order: [['created_at', 'DESC']]
    });
    
    return subscription;
  } catch (error) {
    console.error('Error getting active subscription:', error);
    return null;
  }
};

/**
 * Check if user is a team member with job posting permissions
 * @param {string} userId - The user ID to check
 * @param {string} employerProfileId - The employer profile ID
 * @returns {Promise<boolean>} - True if user can post jobs as team member
 */
export const canPostJobsAsTeamMember = async (userId, employerProfileId) => {
  try {
    const { TeamMember } = await import('../models/index.js');
    
    const teamMember = await TeamMember.findOne({
      where: {
        user_id: userId,
        employer_profile_id: employerProfileId
      }
    });
    
    if (!teamMember) return false;
    
    // Check if user is primary owner or has permission to post jobs
    return (teamMember.role === 'primary_owner') || 
           (teamMember.permissions && teamMember.permissions.can_post_jobs);
  } catch (error) {
    console.error('Error checking team member permissions:', error);
    return false;
  }
};
