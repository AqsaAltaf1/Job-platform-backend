import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load from config.env first, then fall back to .env
try {
  dotenv.config({ path: path.join(__dirname, 'config.env') });
  console.log('✅ Loaded environment variables from config.env');
} catch (error) {
  console.log('⚠️  Could not load config.env, trying .env');
  dotenv.config();
}

import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import {
  register,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  getUserProfile,
  updateUserProfile,
  getAllUserProfiles
} from './controllers/userController.js';
import {
  getUserExperiences,
  createExperience,
  updateExperience,
  deleteExperience
} from './controllers/experienceController.js';
import {
  getUserProjects,
  createProject,
  updateProject,
  deleteProject
} from './controllers/projectController.js';
import {
  getUserEducations,
  createEducation,
  updateEducation,
  deleteEducation
} from './controllers/educationController.js';
import {
  sendOtp,
  verifyOtp,
  resendOtp,
  cleanupExpiredOtps
} from './controllers/otpController.js';
import {
  getCandidateSkills,
  getSkillDetails,
  createEnhancedSkill,
  updateEnhancedSkill,
  deleteEnhancedSkill,
  addSkillEvidence,
  updateSkillEvidence,
  deleteSkillEvidence,
  addPeerEndorsement,
  updatePeerEndorsement,
  deletePeerEndorsement,
  getSkillEndorsements
} from './controllers/enhancedSkillController.js';
import { 
  getCandidates, 
  getCandidateProfile, 
  getCandidateStats, 
  testCandidates 
} from './controllers/candidateController.js';
import { 
  getWebhookEvents, 
  getWebhookEvent, 
  retryWebhookEvent, 
  getWebhookStats 
} from './controllers/webhookController.js';
import { 
  getAdminSubscriptionPlans, 
  getSubscriptionPlan, 
  createSubscriptionPlan, 
  updateSubscriptionPlan, 
  deleteSubscriptionPlan, 
  getSubscriptionPlanStats,
  getPublicSubscriptionPlans
} from './controllers/packageController.js';
import {
  exchangeCodeForToken,
  fetchLinkedInProfile,
  importLinkedInSkills
} from './controllers/linkedinController.js';
import {
  exchangeCodeForToken as googleExchangeCodeForToken,
  fetchGoogleProfile,
  authenticateWithGoogle
} from './controllers/googleController.js';
import {
  createVerificationSession,
  getVerificationStatus,
  handleWebhook,
  getUserVerificationStatus
} from './controllers/veriffController.js';
import {
  getCandidateInvitations,
  createReviewerInvitation,
  getInvitationByToken,
  submitReviewerFeedback,
  updateInvitationStatus,
  deleteReviewerInvitation
} from './controllers/reviewerInvitationController.js';
import {
  processEndorsementText,
  analyzeReviewerConsistency,
  getBiasReductionAnalytics,
  batchProcessEndorsements,
  getReviewerConsistencyReport
} from './controllers/biasReductionController.js';

import {
  getTeamMembers,
  inviteTeamMember,
  verifyInvitation,
  acceptInvitation,
  getTeamMemberProfile,
  updateTeamMember,
  deleteTeamMember
} from './controllers/teamController.js';

import {
  getAllJobs,
  getJobById,
  getEmployerJobs,
  createJob,
  updateJob,
  deleteJob,
  getJobStatistics
} from './controllers/jobController.js';

import {
  applyForJob,
  getCandidateApplications,
  getJobApplications,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
  getAllApplicationsForEmployer
} from './controllers/applicationController.js';

import {
  saveJob,
  unsaveJob,
  getSavedJobs,
  checkJobSaved,
  updateSavedJobNotes
} from './controllers/savedJobController.js';

import {
  getDashboardStats,
  getRecentApplications,
  getRecentJobs
} from './controllers/dashboardController.js';

import {
  getEmployerAnalytics
} from './controllers/analyticsController.js';

import {
  getEmployerInterviews,
  getShortlistedApplications,
  scheduleInterview,
  updateInterviewStatus
} from './controllers/interviewController.js';

import {
  createOrUpdateRating,
  getApplicationRatings,
  getRatingAnalytics,
  deleteRating
} from './controllers/ratingController.js';

import {
  bulkUpdateStatus,
  bulkSendEmails,
  bulkDeleteApplications,
  exportApplications
} from './controllers/bulkActionsController.js';

import {
  predictCandidateSuccess,
  calculateCompatibility,
  getTopCandidateMatches,
  performNLPAnalysis,
  predictRetention,
  getModelMetrics,
  batchProcessCandidates
} from './controllers/mlController.js';
import {
  getNarrativeData,
  saveAchievement,
  deleteAchievement,
  saveNarrativeSection,
  deleteNarrativeSection
} from './controllers/narrativeController.js';

import {
  getVerifiedWorkHistory,
  getReferences,
  getReferenceTemplates,
  sendReferenceRequest,
  toggleReferenceVisibility,
  removeReference,
  getDashboardStats as getCandidateDashboardStats,
  getTransparencyData
} from './controllers/candidateDashboardController.js';

import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationStats,
  bulkCreateNotifications
} from './controllers/notificationController.js';

import {
  getCustomizationData,
  savePortfolioItem,
  deletePortfolioItem,
  saveWorkSample,
  deleteWorkSample
} from './controllers/portfolioController.js';

import {
  uploadPortfolioImage,
  upload
} from './controllers/uploadController.js';

import {
  trainModel,
  evaluateModel,
  deployModel,
  getModelHistory,
  extractTrainingData,
  getPipelineStatus,
  triggerRetraining
} from './controllers/mlPipelineController.js';

import {
  getSubscriptionPlans,
  createCheckoutSession,
  createSubscriptionChangeSession,
  getCurrentSubscription,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionHistory,
  handleStripeWebhook,
  createSubscription,
  handleCheckoutSuccess,
  getSubscriptionAnalytics
} from './controllers/subscriptionController.js';

import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser
} from './controllers/adminController.js';

import {
  testWebhook,
  getWebhookLogs
} from './controllers/webhookTestController.js';

import {
  getCompanies,
  getCompanyById,
  getCompanyStats
} from './controllers/companyController.js';

// Import Stripe routes
import stripeRoutes from './routes/stripeRoutes.js';

// Import Reference routes
import referenceRoutes from './routes/referenceRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://job-platform-zsyc-kvxkwi10c-aqsaaltafs-projects.vercel.app',
    'https://job-platform-zsyc.vercel.app' // Main Vercel URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Raw body parser for Stripe webhooks
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Job Portal Backend is running! 🚀' });
});

// Test database connection
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      message: 'Database connected successfully! ✅',
      status: 'healthy'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Database connection failed! ❌',
      error: error.message
    });
  }
});

// API Routes

// OTP Routes
app.post('/api/otp/send', sendOtp);
app.post('/api/otp/verify', verifyOtp);
app.post('/api/otp/resend', resendOtp);
app.post('/api/otp/cleanup', authenticateToken, requireRole(['super_admin']), cleanupExpiredOtps);

// LinkedIn Integration Routes
app.post('/api/auth/linkedin/token', exchangeCodeForToken);
app.post('/api/auth/linkedin/profile', fetchLinkedInProfile);
app.post('/api/auth/linkedin/import-skills', authenticateToken, importLinkedInSkills);

// Google OAuth Integration Routes
app.post('/api/auth/google/token', googleExchangeCodeForToken);
app.post('/api/auth/google/profile', fetchGoogleProfile);
app.post('/api/auth/google/authenticate', authenticateWithGoogle);

// Veriff Identity Verification Routes
app.post('/api/verification/create-session', authenticateToken, createVerificationSession);
app.get('/api/verification/status/:sessionId', authenticateToken, getVerificationStatus);
app.get('/api/verification/user-status', authenticateToken, getUserVerificationStatus);
app.post('/api/verification/webhook', handleWebhook);

// User Authentication Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/profile', authenticateToken, getProfile);

// User CRUD Routes
app.get('/api/users', authenticateToken, requireRole(['super_admin']), getAllUsers);
app.get('/api/users/:id', authenticateToken, getUserById);
app.put('/api/users/:id', authenticateToken, updateUser);
app.delete('/api/users/:id', authenticateToken, requireRole(['super_admin']), deleteUser);

// User Profile Routes
app.get('/api/profiles', authenticateToken, requireRole(['super_admin']), getAllUserProfiles);
app.get('/api/profiles/:id', authenticateToken, getUserProfile);
app.put('/api/profiles', authenticateToken, updateUserProfile);

// Experience Routes (Candidate only)
app.get('/api/experiences', authenticateToken, getUserExperiences);
app.post('/api/experiences', authenticateToken, createExperience);
app.put('/api/experiences/:id', authenticateToken, updateExperience);
app.delete('/api/experiences/:id', authenticateToken, deleteExperience);

// Project Routes (Candidate only)
app.get('/api/projects', authenticateToken, getUserProjects);
app.post('/api/projects', authenticateToken, createProject);
app.put('/api/projects/:id', authenticateToken, updateProject);
app.delete('/api/projects/:id', authenticateToken, deleteProject);

// Education Routes (Candidate only)
app.get('/api/educations', authenticateToken, getUserEducations);
app.post('/api/educations', authenticateToken, createEducation);
app.put('/api/educations/:id', authenticateToken, updateEducation);
app.delete('/api/educations/:id', authenticateToken, deleteEducation);

// Enhanced Skills Routes (Candidate only)
app.get('/api/candidates/:candidateId/skills', authenticateToken, getCandidateSkills);
app.get('/api/skills/:skillId', authenticateToken, getSkillDetails);
app.post('/api/candidates/:candidateId/skills', authenticateToken, createEnhancedSkill);
app.put('/api/skills/:skillId', authenticateToken, updateEnhancedSkill);
app.delete('/api/skills/:skillId', authenticateToken, deleteEnhancedSkill);

// Narrative Routes (Candidate only)
app.get('/api/candidate/narrative-data', authenticateToken, getNarrativeData);
app.post('/api/candidate/achievement', authenticateToken, saveAchievement);
app.put('/api/candidate/achievement/:id', authenticateToken, saveAchievement);
app.delete('/api/candidate/achievement/:id', authenticateToken, deleteAchievement);
app.post('/api/candidate/narrative-section', authenticateToken, saveNarrativeSection);
app.put('/api/candidate/narrative-section/:id', authenticateToken, saveNarrativeSection);
app.delete('/api/candidate/narrative-section/:id', authenticateToken, deleteNarrativeSection);

// Portfolio Routes (Candidate only)
app.get('/api/candidate/customization-data', authenticateToken, getCustomizationData);
app.post('/api/candidate/portfolio-item', authenticateToken, savePortfolioItem);
app.put('/api/candidate/portfolio-item/:id', authenticateToken, savePortfolioItem);
app.delete('/api/candidate/portfolio-item/:id', authenticateToken, deletePortfolioItem);
app.post('/api/candidate/work-sample', authenticateToken, saveWorkSample);
app.put('/api/candidate/work-sample/:id', authenticateToken, saveWorkSample);
app.delete('/api/candidate/work-sample/:id', authenticateToken, deleteWorkSample);

// Upload Routes
app.post('/api/upload/portfolio-image', authenticateToken, upload.single('image'), uploadPortfolioImage);

// Skill Evidence Routes
app.post('/api/skills/:skillId/evidence', authenticateToken, addSkillEvidence);
app.put('/api/evidence/:evidenceId', authenticateToken, updateSkillEvidence);
app.delete('/api/evidence/:evidenceId', authenticateToken, deleteSkillEvidence);

// Peer Endorsement Routes
app.get('/api/skills/:skillId/endorsements', authenticateToken, getSkillEndorsements);
app.post('/api/skills/:skillId/endorsements', authenticateToken, addPeerEndorsement);
app.put('/api/endorsements/:endorsementId', authenticateToken, updatePeerEndorsement);
app.delete('/api/endorsements/:endorsementId', authenticateToken, deletePeerEndorsement);

// Reviewer Invitation Routes
app.get('/api/candidates/:candidateId/invitations', authenticateToken, getCandidateInvitations);
app.post('/api/candidates/:candidateId/invitations', authenticateToken, createReviewerInvitation);
app.get('/api/invitations/:token', getInvitationByToken);
app.put('/api/invitations/:invitationId', authenticateToken, updateInvitationStatus);
app.delete('/api/invitations/:invitationId', authenticateToken, deleteReviewerInvitation);

// Public reviewer routes (no authentication required)
app.get('/api/review/:token', getInvitationByToken);
app.post('/api/review/:token/feedback', submitReviewerFeedback);

// Candidate Routes (for employers to browse candidates)
app.get('/api/candidates', authenticateToken, requireRole(['employer', 'team_member']), getCandidates);
app.get('/api/candidates/:id', authenticateToken, requireRole(['employer', 'team_member']), getCandidateProfile);
app.get('/api/candidates/stats', authenticateToken, requireRole(['employer', 'team_member']), getCandidateStats);
app.get('/api/test-candidates', testCandidates); // Test endpoint without auth

// Webhook management routes (admin only)
app.get('/api/admin/webhook-events', authenticateToken, requireRole(['super_admin']), getWebhookEvents);
app.get('/api/admin/webhook-events/:id', authenticateToken, requireRole(['super_admin']), getWebhookEvent);
app.post('/api/admin/webhook-events/:id/retry', authenticateToken, requireRole(['super_admin']), retryWebhookEvent);
app.get('/api/admin/webhook-stats', authenticateToken, requireRole(['super_admin']), getWebhookStats);

// Public subscription plans route (for pricing page)
app.get('/api/subscription-plans', getPublicSubscriptionPlans);

// Package management routes (admin only)
app.get('/api/admin/subscription-plans', authenticateToken, requireRole(['super_admin']), getAdminSubscriptionPlans);
app.get('/api/admin/subscription-plans/:id', authenticateToken, requireRole(['super_admin']), getSubscriptionPlan);
app.post('/api/admin/subscription-plans', authenticateToken, requireRole(['super_admin']), createSubscriptionPlan);
app.put('/api/admin/subscription-plans/:id', authenticateToken, requireRole(['super_admin']), updateSubscriptionPlan);
app.delete('/api/admin/subscription-plans/:id', authenticateToken, requireRole(['super_admin']), deleteSubscriptionPlan);
app.get('/api/admin/subscription-plans-stats', authenticateToken, requireRole(['super_admin']), getSubscriptionPlanStats);

// Bias Reduction Routes
app.post('/api/bias-reduction/process-endorsement', authenticateToken, processEndorsementText);
app.get('/api/bias-reduction/reviewer/:reviewerEmail/consistency', authenticateToken, analyzeReviewerConsistency);
app.get('/api/bias-reduction/analytics', authenticateToken, getBiasReductionAnalytics);
app.post('/api/bias-reduction/batch-process', authenticateToken, batchProcessEndorsements);
app.get('/api/bias-reduction/consistency-report', authenticateToken, getReviewerConsistencyReport);

// Team Management Routes
app.get('/api/team-members/:employerProfileId', authenticateToken, getTeamMembers);
app.post('/api/team-members', authenticateToken, inviteTeamMember);
app.put('/api/team-members/:id', authenticateToken, updateTeamMember);
app.delete('/api/team-members/:id', authenticateToken, deleteTeamMember);
app.get('/api/team/profile', authenticateToken, getTeamMemberProfile);
app.get('/api/team/verify-invitation', verifyInvitation); // No auth needed for invitation verification
app.post('/api/team/accept-invitation', acceptInvitation); // No auth needed for invitation acceptance

// Job Management Routes
app.get('/api/jobs', getAllJobs); // Public endpoint for job listings
app.get('/api/jobs/:id', getJobById); // Public endpoint for single job
app.get('/api/employer/jobs', authenticateToken, getEmployerJobs); // Employer's jobs
app.post('/api/jobs', authenticateToken, createJob); // Create job
app.put('/api/jobs/:id', authenticateToken, updateJob); // Update job
app.delete('/api/jobs/:id', authenticateToken, deleteJob); // Delete job
app.get('/api/employer/job-statistics', authenticateToken, getJobStatistics); // Job statistics

// Job Application Routes
app.post('/api/jobs/:job_id/apply', authenticateToken, applyForJob); // Apply for job
app.get('/api/candidate/applications', authenticateToken, getCandidateApplications); // Candidate's applications
app.get('/api/jobs/:job_id/applications', authenticateToken, getJobApplications); // Job applications for employers
app.get('/api/applications/:id', authenticateToken, getApplicationById); // Single application
app.put('/api/applications/:id/status', authenticateToken, updateApplicationStatus); // Update application status
app.put('/api/applications/:id/withdraw', authenticateToken, withdrawApplication); // Withdraw application
app.get('/api/employer/all-applications', authenticateToken, getAllApplicationsForEmployer); // All applications for pipeline

// Saved Job Routes
app.post('/api/jobs/:job_id/save', authenticateToken, saveJob); // Save a job
app.delete('/api/jobs/:job_id/save', authenticateToken, unsaveJob); // Unsave a job
app.get('/api/candidate/saved-jobs', authenticateToken, getSavedJobs); // Get saved jobs
app.get('/api/jobs/:job_id/saved', authenticateToken, checkJobSaved); // Check if job is saved
app.put('/api/jobs/:job_id/save/notes', authenticateToken, updateSavedJobNotes); // Update saved job notes

// Dashboard Routes
app.get('/api/employer/dashboard-stats', authenticateToken, getDashboardStats); // Get dashboard statistics
app.get('/api/employer/recent-applications', authenticateToken, getRecentApplications); // Get recent applications
app.get('/api/employer/recent-jobs', authenticateToken, getRecentJobs); // Get recent jobs

// Candidate Dashboard Routes
app.get('/api/candidate/dashboard-stats', authenticateToken, getCandidateDashboardStats); // Get candidate dashboard statistics
app.get('/api/candidate/transparency-data', authenticateToken, getTransparencyData); // Get candidate transparency data
app.get('/api/candidate/verified-work-history', authenticateToken, getVerifiedWorkHistory); // Get verified work history
app.get('/api/candidate/references', authenticateToken, getReferences); // Get candidate references
app.get('/api/candidate/reference-templates', authenticateToken, getReferenceTemplates); // Get reference templates
app.post('/api/candidate/references/request', authenticateToken, sendReferenceRequest); // Send reference request
app.put('/api/candidate/references/:id/visibility', authenticateToken, toggleReferenceVisibility); // Toggle reference visibility
app.delete('/api/candidate/references/:id', authenticateToken, removeReference); // Remove reference

// Notification Routes
app.get('/api/notifications', authenticateToken, getNotifications); // Get user notifications
app.post('/api/notifications', authenticateToken, createNotification); // Create notification
app.put('/api/notifications/:id/read', authenticateToken, markNotificationAsRead); // Mark notification as read
app.put('/api/notifications/mark-all-read', authenticateToken, markAllNotificationsAsRead); // Mark all notifications as read
app.delete('/api/notifications/:id', authenticateToken, deleteNotification); // Delete notification
app.delete('/api/notifications/clear-all', authenticateToken, clearAllNotifications); // Clear all notifications
app.get('/api/notifications/stats', authenticateToken, getNotificationStats); // Get notification statistics
app.post('/api/notifications/bulk', authenticateToken, bulkCreateNotifications); // Bulk create notifications

// Analytics Routes
app.get('/api/employer/analytics', authenticateToken, getEmployerAnalytics); // Get comprehensive analytics

// Interview Routes
app.get('/api/employer/interviews', authenticateToken, getEmployerInterviews); // Get all interviews
app.get('/api/employer/shortlisted-applications', authenticateToken, getShortlistedApplications); // Get shortlisted applications
app.post('/api/employer/schedule-interview', authenticateToken, scheduleInterview); // Schedule interview
app.put('/api/employer/interviews/:id/status', authenticateToken, updateInterviewStatus); // Update interview status

// Candidate Rating Routes
app.post('/api/applications/:application_id/rating', authenticateToken, createOrUpdateRating); // Create or update rating
app.get('/api/applications/:application_id/ratings', authenticateToken, getApplicationRatings); // Get application ratings
app.get('/api/employer/rating-analytics', authenticateToken, getRatingAnalytics); // Get rating analytics
app.delete('/api/ratings/:rating_id', authenticateToken, deleteRating); // Delete rating

// Bulk Actions Routes
app.post('/api/employer/bulk/update-status', authenticateToken, bulkUpdateStatus); // Bulk update application status
app.post('/api/employer/bulk/send-emails', authenticateToken, bulkSendEmails); // Bulk send emails
app.post('/api/employer/bulk/delete-applications', authenticateToken, bulkDeleteApplications); // Bulk delete applications
app.post('/api/employer/bulk/export-applications', authenticateToken, exportApplications); // Export applications

// ML Prediction Routes
app.get('/api/ml/predict-success/:candidate_id/:job_id', authenticateToken, predictCandidateSuccess); // Predict candidate success
app.get('/api/ml/compatibility/:candidate_id/:job_id', authenticateToken, calculateCompatibility); // Calculate compatibility score
app.get('/api/ml/top-matches/:job_id', authenticateToken, getTopCandidateMatches); // Get top candidate matches
app.post('/api/ml/nlp-analysis', authenticateToken, performNLPAnalysis); // Advanced NLP analysis
app.get('/api/ml/predict-retention/:candidate_id/:job_id', authenticateToken, predictRetention); // Predict retention
app.get('/api/ml/model-metrics', authenticateToken, getModelMetrics); // Get model performance metrics
app.post('/api/ml/batch-process', authenticateToken, batchProcessCandidates); // Batch process candidates

// ML Pipeline Management Routes (Admin only)
app.post('/api/ml/pipeline/train/:model_name', authenticateToken, trainModel); // Train ML model
app.get('/api/ml/pipeline/evaluate/:model_name', authenticateToken, evaluateModel); // Evaluate model
app.post('/api/ml/pipeline/deploy/:model_name', authenticateToken, deployModel); // Deploy model
app.get('/api/ml/pipeline/history/:model_name', authenticateToken, getModelHistory); // Get model history
app.post('/api/ml/pipeline/extract-data/:model_name', authenticateToken, extractTrainingData); // Extract training data
app.get('/api/ml/pipeline/status', authenticateToken, getPipelineStatus); // Get pipeline status
app.post('/api/ml/pipeline/retrain', authenticateToken, triggerRetraining); // Trigger retraining

// Subscription Routes
app.get('/api/subscription/plans', getSubscriptionPlans); // Get all subscription plans (public)
app.post('/api/subscription/checkout', authenticateToken, createCheckoutSession); // Create checkout session
app.post('/api/subscription/create', authenticateToken, createSubscription); // Create subscription with payment method
app.post('/api/subscription/change', authenticateToken, createSubscriptionChangeSession); // Change subscription plan
app.get('/api/subscription/current', authenticateToken, getCurrentSubscription); // Get current subscription
app.post('/api/subscription/:subscription_id/cancel', authenticateToken, cancelSubscription); // Cancel subscription
app.post('/api/subscription/:subscription_id/resume', authenticateToken, resumeSubscription); // Resume subscription
app.get('/api/subscription/history', authenticateToken, getSubscriptionHistory); // Get subscription history
app.post('/api/subscription/webhook', handleStripeWebhook); // Stripe webhook (no auth)
app.get('/api/subscription/success', handleCheckoutSuccess); // Handle checkout success
app.get('/api/admin/subscription-analytics', authenticateToken, getSubscriptionAnalytics); // Admin analytics

// Admin Management Routes (duplicate routes removed - already defined above)

// Webhook Testing Routes (Development only)
app.post('/api/test/webhook', testWebhook); // Test webhook functionality
app.get('/api/test/webhook-logs', getWebhookLogs); // Get webhook logs

// Company Routes
app.get('/api/companies', getCompanies); // Get all companies with filters
app.get('/api/companies/stats', getCompanyStats); // Get company statistics
app.get('/api/companies/:id', getCompanyById); // Get company by ID

// Stripe Sync Routes
app.use('/api/stripe', stripeRoutes);

// Reference Routes
app.use('/api/references', referenceRoutes);

// Start server
app.listen(PORT, async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔐 Auth endpoints: /api/auth/register, /api/auth/login`);
  console.log(`👥 User endpoints: /api/users`);
});
