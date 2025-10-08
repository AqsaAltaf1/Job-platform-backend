import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  syncFromStripe,
  syncToStripe,
  handleStripeWebhook,
  getStripeProducts,
  syncAllFromStripe
} from '../controllers/stripeController.js';

const router = express.Router();

// Webhook endpoint (no auth required - Stripe handles verification)
router.post('/webhook', handleStripeWebhook);

// Admin routes (require super_admin role)
router.use(authenticateToken);
router.use(requireRole(['super_admin']));

// Sync specific package from Stripe to website
router.post('/sync-from-stripe/:productId', syncFromStripe);

// Sync specific package from website to Stripe
router.post('/sync-to-stripe/:planId', syncToStripe);

// Get all Stripe products
router.get('/products', getStripeProducts);

// Sync all packages from Stripe
router.post('/sync-all-from-stripe', syncAllFromStripe);

export default router;
