import express from 'express';
import { 
  createReferenceInvitation,
  getReferenceInvitation,
  submitReference,
  getCandidateReferences,
  getCandidateReferenceInvitations,
  requestReferenceUpdate,
  toggleReferenceOutdated,
  logProfileView,
  getProfileViewTransparency
} from '../controllers/referenceController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/invitation/:token', getReferenceInvitation);
router.post('/submit/:token', submitReference);

// Protected routes (authentication required)
router.post('/invite', authenticateToken, createReferenceInvitation);
router.get('/candidate/references', authenticateToken, getCandidateReferences);
router.get('/candidate/invitations', authenticateToken, getCandidateReferenceInvitations);

// New reference management routes
router.post('/:id/request-update', authenticateToken, requestReferenceUpdate);
router.put('/:id/outdated', authenticateToken, toggleReferenceOutdated);

// Profile view logging routes
router.post('/profile-view/:candidate_id', logProfileView); // Public route for logging views
router.get('/transparency-data', authenticateToken, getProfileViewTransparency);

export default router;


