import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createVerifiedEmployment,
  listVerifiedEmployments,
  requestEmployerReview,
  getReviewByToken,
  submitReviewByToken,
  deleteVerifiedEmployment,
  updateVerifiedEmployment,
} from '../controllers/verifiedEmploymentController.js';

const router = express.Router();

// Candidate-owned routes
router.post('/', authenticateToken, createVerifiedEmployment);
router.get('/', authenticateToken, listVerifiedEmployments);
router.post('/:id/request', authenticateToken, requestEmployerReview);
router.put('/:id', authenticateToken, updateVerifiedEmployment);
router.delete('/:id', authenticateToken, deleteVerifiedEmployment);

// Public review routes (no auth)
router.get('/review/:token', getReviewByToken);
router.post('/review/:token', submitReviewByToken);

export default router;


