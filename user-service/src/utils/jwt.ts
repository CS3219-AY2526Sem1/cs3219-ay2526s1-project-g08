import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jwtsecret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refreshsecret";

/**
 * Sign an access token (short-lived)
 */
export function signAccessToken(payload: object): string {
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || "1h";
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions);
}

/**
 * Sign a refresh token (long-lived)
 * Note: The actual refresh token stored in DB is a UUID, not a JWT
 * This is used if you want to encode additional data in the refresh token
 */
export function signRefreshToken(payload: object): string {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRY || "30d";
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn } as SignOptions);
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify a refresh token (JWT-based)
 */
export function verifyRefreshTokenJwt(token: string) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use signAccessToken instead
 */
export function signJwt(payload: object): string {
  return signAccessToken(payload);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken instead
 */
export function verifyJwt(token: string) {
  return verifyAccessToken(token);
}
