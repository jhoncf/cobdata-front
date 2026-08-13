/**
 * JWT payload decoder (client-side, no signature verification).
 * Used to extract claims like `mustResetPassword` from the access token.
 */

export interface JwtPayload {
  sub: string;
  accountId: string;
  role: 'ADMIN' | 'OPERATIONAL' | 'VIEWER';
  sessionId: string;
  mustResetPassword?: boolean;
  iat: number;
  exp: number;
}

/**
 * Decodes the payload of a JWT without verifying the signature.
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}
