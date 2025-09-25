import { PrismaClient, User } from '../../generated/prisma';
import { client } from '../config/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { RegisterUserDto, LoginUserDto, AuthResponse, RefreshTokenDto } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = client;
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenVersion: Math.floor(Date.now() / 1000) },
      JWT_SECRET + user.password,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    return { accessToken, refreshToken };
  }

  async register(userData: RegisterUserDto): Promise<AuthResponse> {
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
        isKycPassed: user.isKycPassed
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
        isKycPassed: user.isKycPassed
      }
    };
  }

  async refreshToken(refreshTokenData: RefreshTokenDto): Promise<{ accessToken: string }> {
    try {
      const payload = jwt.verify(refreshTokenData.refreshToken, JWT_SECRET) as any;
      
      const tokenDoc = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshTokenData.refreshToken,
          userId: payload.userId,
          expiresAt: { gte: new Date() }
        },
        include: { user: true }
      });

      if (!tokenDoc) {
        throw new Error('Invalid refresh token');
      }

      const newAccessToken = jwt.sign(
        { userId: tokenDoc.userId, email: tokenDoc.user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
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
