import express from 'express';
import { 
  createReferenceInvitation,
  getReferenceInvitation,
  submitReference,
  getCandidateReferences,
  getCandidateReferenceInvitations
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

export default router;


