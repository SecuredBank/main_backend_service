import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define JWT payload type
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Extend the Express Request type to include our user
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
        //role: string;
      };
    }
  }
}

// Export the auth middleware
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullnames: true,
        isEmailVerified: true,
        isKycPassed: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Create a properly typed user object
    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullnames: user.fullnames,
      isEmailVerified: user.isEmailVerified ?? false,
      isKycPassed: user.isKycPassed ?? false,
      role: user.role ?? 'USER'
    };

    // Attach the user to the request
    req.user = authUser;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isEmailVerified) {
    return res.status(403).json({ 
      message: 'Email verification required',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    });
  }
  next();
};

export const requireKYC = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isKycPassed) {
    return res.status(403).json({ 
      message: 'KYC verification required',
      code: 'KYC_VERIFICATION_REQUIRED'
    });
  }
  next();
};
