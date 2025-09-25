import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { client } from '../config/db';
import { RegisterUserDto, LoginUserDto, AuthResponse, RefreshTokenDto } from '../types/auth';
import { AuthUser } from '../types/user.types';

// JWT payload type
type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  type?: string;  // For refresh tokens
};

const JWT_SECRET = process.env.JWT_SECRET as string || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Ensure JWT secret is set
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using default secret key. This is not recommended for production.');
}

export class AuthService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = client as unknown as PrismaClient;
  }

  private generateTokens(user: AuthUser): { accessToken: string; refreshToken: string } {
    // Create JWT payload
    const accessPayload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'USER',
      type: 'access'
    };

    const refreshPayload = {
      ...accessPayload,
      type: 'refresh'
    };

    // Generate access token
    const accessToken = jwt.sign(
      accessPayload as object,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
    
    // Generate refresh token with longer expiry
    const refreshToken = jwt.sign(
      refreshPayload as object,
      JWT_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  async register(userData: RegisterUserDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('Email or username already in use');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user = await this.prisma.user.create({
      data: {
        fullnames: userData.fullnames,
        email: userData.email,
        username: userData.username,
        password: hashedPassword
      }
    });

    const { accessToken, refreshToken } = this.generateTokens(user);

    // Save refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullnames: user.fullnames,
        isEmailVerified: user.isEmailVerified,
        isKycPassed: user.isKycPassed,
        role: user.role
      }
    };
  }

  async login(loginData: LoginUserDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginData.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    // Save refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullnames: user.fullnames,
        isEmailVerified: user.isEmailVerified,
        isKycPassed: user.isKycPassed,
        role: user.role
      }
    };
  }

  async refreshToken(refreshTokenData: RefreshTokenDto): Promise<{ accessToken: string }> {
    try {
      // Verify the refresh token
      const payload = jwt.verify(refreshTokenData.refreshToken, JWT_SECRET) as JwtPayload;
      
      if (payload.type && payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Find the token in the database
      const tokenDoc = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshTokenData.refreshToken,
          userId: payload.userId,
          expiresAt: { gte: new Date() }
        },
        include: { user: true }
      });

      if (!tokenDoc || !tokenDoc.user) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new access token
      const accessPayload: JwtPayload = {
        userId: tokenDoc.user.id,
        email: tokenDoc.user.email,
        role: tokenDoc.user.role || 'USER',
        type: 'access'
      };

      const newAccessToken = jwt.sign(
        accessPayload as object,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }
}

export const authService = new AuthService();
