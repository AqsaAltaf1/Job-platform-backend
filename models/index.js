import sequelize from '../config/database.js';
import User from './User.js';
import { EmployerProfile } from './EmployerProfile.js';
import { CandidateProfile } from './CandidateProfile.js';
import { Experience } from './Experience.js';
import { Project } from './Project.js';
import { Education } from './Education.js';
import { EnhancedSkill } from './EnhancedSkill.js';
import { SkillEvidence } from './SkillEvidence.js';
import { PeerEndorsement } from './PeerEndorsement.js';
import { ReviewerInvitation } from './ReviewerInvitation.js';
import { TeamMember } from './TeamMember.js';
import Job from './Job.js';
import JobApplication from './JobApplication.js';
import SavedJob from './SavedJob.js';
import Interview from './Interview.js';
import CandidateRating from './CandidateRating.js';
import SubscriptionPlan from './SubscriptionPlan.js';
import Subscription from './Subscription.js';
import SubscriptionHistory from './SubscriptionHistory.js';
import Admin from './Admin.js';
import Otp from './Otp.js';
import { WebhookEvent } from './WebhookEvent.js';
import { Achievement } from './Achievement.js';
import { NarrativeSection } from './NarrativeSection.js';
import { PortfolioItem } from './PortfolioItem.js';
import { WorkSample } from './WorkSample.js';
import Notification from './Notification.js';
import Reference from './Reference.js';
import ReferenceInvitation from './ReferenceInvitation.js';
import VerifiedEmploymentModel from './VerifiedEmployment.js';
import ProfileView from './ProfileView.js';
import AuditLog from './AuditLog.js';
import PrivacySetting from './PrivacySetting.js';
import DataExport from './DataExport.js';

// Initialize models that are factory functions
const VerifiedEmployment = VerifiedEmploymentModel(sequelize);

// Define associations
User.hasOne(EmployerProfile, { foreignKey: 'user_id', as: 'employerProfile' });
User.hasOne(CandidateProfile, { foreignKey: 'user_id', as: 'candidateProfile' });

EmployerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CandidateProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Experience, Project, and Education associations (only for candidates)
CandidateProfile.hasMany(Experience, { foreignKey: 'user_profile_id', as: 'experiences' });
CandidateProfile.hasMany(Project, { foreignKey: 'user_profile_id', as: 'projects' });
CandidateProfile.hasMany(Education, { foreignKey: 'user_profile_id', as: 'educations' });

Experience.belongsTo(CandidateProfile, { foreignKey: 'user_profile_id', as: 'candidateProfile' });
Project.belongsTo(CandidateProfile, { foreignKey: 'user_profile_id', as: 'candidateProfile' });
Education.belongsTo(CandidateProfile, { foreignKey: 'user_profile_id', as: 'candidateProfile' });

// Enhanced Skills associations
CandidateProfile.hasMany(EnhancedSkill, { foreignKey: 'candidate_profile_id', as: 'coreSkills' });
CandidateProfile.hasMany(ReviewerInvitation, { foreignKey: 'candidate_profile_id', as: 'reviewerInvitations' });
CandidateProfile.hasMany(VerifiedEmployment, { foreignKey: 'candidate_profile_id', as: 'verifiedEmployments' });

EnhancedSkill.belongsTo(CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
EnhancedSkill.hasMany(SkillEvidence, { foreignKey: 'enhanced_skill_id', as: 'evidence' });
EnhancedSkill.hasMany(PeerEndorsement, { foreignKey: 'enhanced_skill_id', as: 'endorsements' });

SkillEvidence.belongsTo(EnhancedSkill, { foreignKey: 'enhanced_skill_id', as: 'enhancedSkill' });
PeerEndorsement.belongsTo(EnhancedSkill, { foreignKey: 'enhanced_skill_id', as: 'enhancedSkill' });
ReviewerInvitation.belongsTo(CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
VerifiedEmployment.belongsTo(CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });

// Team Member associations
EmployerProfile.hasMany(TeamMember, { foreignKey: 'employer_profile_id', as: 'teamMembers' });
TeamMember.belongsTo(EmployerProfile, { foreignKey: 'employer_profile_id', as: 'employerProfile' });
TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(TeamMember, { foreignKey: 'user_id', as: 'teamMember' });

// Job associations
EmployerProfile.hasMany(Job, { foreignKey: 'employer_profile_id', as: 'jobs' });
Job.belongsTo(EmployerProfile, { foreignKey: 'employer_profile_id', as: 'employerProfile' });
Job.belongsTo(User, { foreignKey: 'posted_by', as: 'postedBy' });
User.hasMany(Job, { foreignKey: 'posted_by', as: 'postedJobs' });

// Job Application associations
Job.hasMany(JobApplication, { foreignKey: 'job_id', as: 'applications' });
JobApplication.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });
JobApplication.belongsTo(User, { foreignKey: 'candidate_id', as: 'candidate' });
JobApplication.belongsTo(CandidateProfile, { foreignKey: 'candidate_profile_id', as: 'candidateProfile' });
JobApplication.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
User.hasMany(JobApplication, { foreignKey: 'candidate_id', as: 'applications' });
CandidateProfile.hasMany(JobApplication, { foreignKey: 'candidate_profile_id', as: 'applications' });

// Saved Job associations
User.hasMany(SavedJob, { foreignKey: 'candidate_id', as: 'savedJobs' });
Job.hasMany(SavedJob, { foreignKey: 'job_id', as: 'savedByUsers' });
SavedJob.belongsTo(User, { foreignKey: 'candidate_id', as: 'candidate' });
SavedJob.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

// Interview associations
JobApplication.hasMany(Interview, { foreignKey: 'application_id', as: 'interviews' });
Interview.belongsTo(JobApplication, { foreignKey: 'application_id', as: 'application' });
Interview.belongsTo(User, { foreignKey: 'interviewer_id', as: 'interviewer' });
Interview.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });
User.hasMany(Interview, { foreignKey: 'interviewer_id', as: 'conductedInterviews' });
Job.hasMany(Interview, { foreignKey: 'job_id', as: 'jobInterviews' });

// Candidate Rating associations
JobApplication.hasMany(CandidateRating, { foreignKey: 'application_id', as: 'ratings' });
CandidateRating.belongsTo(JobApplication, { foreignKey: 'application_id', as: 'application' });
CandidateRating.belongsTo(User, { foreignKey: 'rater_id', as: 'rater' });
CandidateRating.belongsTo(Interview, { foreignKey: 'interview_id', as: 'interview' });
User.hasMany(CandidateRating, { foreignKey: 'rater_id', as: 'givenRatings' });
Interview.hasMany(CandidateRating, { foreignKey: 'interview_id', as: 'ratings' });

// Export models and sequelize
// Subscription associations
User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

EmployerProfile.hasMany(Subscription, { foreignKey: 'employer_profile_id', as: 'subscriptions' });
Subscription.belongsTo(EmployerProfile, { foreignKey: 'employer_profile_id', as: 'employerProfile' });

SubscriptionPlan.hasMany(Subscription, { foreignKey: 'subscription_plan_id', as: 'subscriptions' });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'subscription_plan_id', as: 'subscriptionPlan' });

Subscription.hasMany(SubscriptionHistory, { foreignKey: 'subscription_id', as: 'history' });
SubscriptionHistory.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

User.hasMany(SubscriptionHistory, { foreignKey: 'user_id', as: 'subscriptionHistory' });
SubscriptionHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

SubscriptionPlan.hasMany(SubscriptionHistory, { foreignKey: 'old_plan_id', as: 'oldPlanHistory' });
SubscriptionPlan.hasMany(SubscriptionHistory, { foreignKey: 'new_plan_id', as: 'newPlanHistory' });
SubscriptionHistory.belongsTo(SubscriptionPlan, { foreignKey: 'old_plan_id', as: 'oldPlan' });
SubscriptionHistory.belongsTo(SubscriptionPlan, { foreignKey: 'new_plan_id', as: 'newPlan' });

// Admin associations
User.hasOne(Admin, { foreignKey: 'user_id', as: 'adminProfile' });
Admin.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Admin.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Narrative associations
User.hasMany(Achievement, { foreignKey: 'user_id', as: 'achievements' });
Achievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(NarrativeSection, { foreignKey: 'user_id', as: 'narrativeSections' });
NarrativeSection.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Portfolio associations
User.hasMany(PortfolioItem, { foreignKey: 'user_id', as: 'portfolioItems' });
PortfolioItem.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(WorkSample, { foreignKey: 'user_id', as: 'workSamples' });
WorkSample.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Reference associations
User.hasMany(Reference, { foreignKey: 'candidate_id', as: 'references' });
Reference.belongsTo(User, { foreignKey: 'candidate_id', as: 'candidate' });

User.hasMany(ReferenceInvitation, { foreignKey: 'candidate_id', as: 'referenceInvitations' });
ReferenceInvitation.belongsTo(User, { foreignKey: 'candidate_id', as: 'candidate' });

ReferenceInvitation.hasOne(Reference, { foreignKey: 'invitation_id', as: 'reference' });
Reference.belongsTo(ReferenceInvitation, { foreignKey: 'invitation_id', as: 'invitation' });

// Profile View associations
User.hasMany(ProfileView, { foreignKey: 'candidate_id', as: 'profileViews' });
ProfileView.belongsTo(User, { foreignKey: 'candidate_id', as: 'candidate' });
ProfileView.belongsTo(User, { foreignKey: 'viewer_id', as: 'viewer' });

// Audit Log associations
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
AuditLog.belongsTo(User, { foreignKey: 'target_user_id', as: 'targetUser' });

// Privacy Setting associations
User.hasMany(PrivacySetting, { foreignKey: 'user_id', as: 'privacySettings' });
PrivacySetting.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
PrivacySetting.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Data Export associations
User.hasMany(DataExport, { foreignKey: 'user_id', as: 'dataExports' });
DataExport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  sequelize,
  User,
  EmployerProfile,
  CandidateProfile,
  Experience,
  Project,
  Education,
  EnhancedSkill,
  SkillEvidence,
  PeerEndorsement,
  ReviewerInvitation,
  TeamMember,
  Job,
  JobApplication,
  SavedJob,
  Interview,
  CandidateRating,
  SubscriptionPlan,
  Subscription,
  SubscriptionHistory,
  Admin,
  Otp,
  Achievement,
  NarrativeSection,
  PortfolioItem,
  WorkSample,
  Notification,
  Reference,
  ReferenceInvitation,
  VerifiedEmployment,
  ProfileView,
  AuditLog,
  PrivacySetting,
  DataExport,
};
