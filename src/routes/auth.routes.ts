import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));

// Protected routes
router.post('/logout', authMiddleware, authController.logout.bind(authController));

// Example of a protected route with email verification
router.get('/profile', 
  authMiddleware, 
  authController.getProfile.bind(authController)
);

export { router as authRoutes };
