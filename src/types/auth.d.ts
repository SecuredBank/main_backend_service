export interface RegisterUserDto {
  fullnames: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    fullnames: string;
    isEmailVerified: boolean;
    isKycPassed: boolean;
    role: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface VerifyEmailDto {
  token: string;
}
