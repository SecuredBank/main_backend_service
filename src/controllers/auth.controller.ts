import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { RegisterUserDto, LoginUserDto, RefreshTokenDto } from '../types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        fullnames: string;
        isEmailVerified: boolean;
        isKycPassed: boolean;
      };
    }
  }
}

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const userData: RegisterUserDto = req.body;
      const authResponse = await authService.register(userData);
      res.status(201).json(authResponse);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const loginData: LoginUserDto = req.body;
      const authResponse = await authService.login(loginData);
      res.json(authResponse);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body as RefreshTokenDto;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      const result = await authService.refreshToken({ refreshToken });
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body as RefreshTokenDto;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      await authService.logout(refreshToken);
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to logout' });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      // The user information is attached to the request by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Return the user's profile information
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
          fullnames: req.user.fullnames,
          isEmailVerified: req.user.isEmailVerified,
          isKycPassed: req.user.isKycPassed
        }
      });
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  }
}

export const authController = new AuthController();
