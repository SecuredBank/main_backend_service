// Define the AuthUser type with all necessary fields
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  fullnames: string;
  isEmailVerified: boolean;
  isKycPassed: boolean;
  role: string;
};

export type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};
