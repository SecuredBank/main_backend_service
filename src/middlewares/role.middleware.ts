import { Request, Response, NextFunction } from 'express';
import { client } from '../config/db';

type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export const requireRole = (roles: Role | Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const user = await client.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!requiredRoles.includes(user.role as Role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({ message: 'Authorization failed' });
    }
  };
};

// Export role enum for use in routes
export const ROLES = {
  USER: 'USER' as const,
  ADMIN: 'ADMIN' as const,
  SUPER_ADMIN: 'SUPER_ADMIN' as const
};
