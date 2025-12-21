import { createClient } from '@farcaster/quick-auth';
import { env } from '../config/env';

// Initialize the client with configuration
const client = createClient({
  // In a production environment, you might want to configure additional options here
});

export interface ValidatedUser {
  fid: number;
  // Add any additional user properties you need
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Verifies a JWT token from the Authorization header
 * @param authHeader - The Authorization header value (e.g., 'Bearer <token>')
 * @returns The validated user or null if invalid
 * @throws {AuthError} If there's an error during verification
 */
export async function verifyAuth(authHeader: string | undefined): Promise<ValidatedUser | null> {
  if (!authHeader) {
    throw new AuthError('Authorization header is required', 'MISSING_AUTH_HEADER');
  }

  const [scheme, token] = authHeader.trim().split(' ');
  
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    throw new AuthError('Invalid authorization scheme', 'INVALID_AUTH_SCHEME');
  }

  try {
    // Verify the JWT using the client
    const result = await client.verifyJwt({
      token,
      domain: env.NEXT_PUBLIC_APP_DOMAIN || 'fcphunksmini.vercel.app',
    });

    if (!result.success) {
      console.warn('JWT verification failed:', result.error);
      return null;
    }

    if (!result.payload || typeof result.payload !== 'object' || !('sub' in result.payload)) {
      console.warn('Invalid JWT payload:', result.payload);
      return null;
    }

    const fid = parseInt(result.payload.sub as string, 10);
    
    if (isNaN(fid)) {
      console.warn('Invalid FID in JWT sub claim:', result.payload.sub);
      return null;
    }

    return { fid };
  } catch (error) {
    console.error('JWT Verification Error:', error);
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(
      'Failed to verify authentication token',
      'VERIFICATION_FAILED',
      500
    );
  }
}

/**
 * Middleware for protecting routes that require authentication
 */
export function requireAuth(handler: (req: any, res: any, user: ValidatedUser) => Promise<any>) {
  return async (req: any, res: any) => {
    try {
      const authHeader = req.headers.authorization;
      const user = await verifyAuth(authHeader);
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        });
      }

      return handler(req, res, user);
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code
        });
      }
      
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
}
