import { Router } from 'express';
import { kycController } from '../controllers/kyc.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireEmailVerification } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all KYC routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/kyc/verify:
 *   post:
 *     summary: Submit KYC documents for verification
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nationalId
 *               - selfie
 *             properties:
 *               nationalId:
 *                 type: string
 *                 format: binary
 *                 description: National ID or Passport image
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Selfie image holding the ID
 *     responses:
 *       201:
 *         description: KYC verification request submitted
 *       400:
 *         description: Invalid input or missing files
 *       401:
 *         description: Unauthorized
 */
router.post('/verify', requireEmailVerification, kycController.requestVerification);

/**
 * @swagger
 * /api/kyc/status:
 *   get:
 *     summary: Get KYC verification status
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/status', kycController.getStatus);

// Webhook endpoint for Onfido callbacks (no auth required)
router.post('/webhook', kycController.webhook);

export default router;
