import { Request, Response } from 'express';
import { requireAuth } from '../../../services/auth';

/**
 * Quick Auth endpoint for Farcaster Mini Apps
 * Verifies the user's authentication token and returns user information
 */
const handler = async (req: Request, res: Response, user: { fid: number }) => {
  try {
    // In a real implementation, you might want to fetch additional user data here
    // For example, from a database or another API
    
    return res.status(200).json({ 
      success: true,
      user: {
        fid: user.fid,
        // Add any additional user data here
      }
    });
  } catch (error) {
    console.error('Quick Auth Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export the handler wrapped with requireAuth middleware
export default requireAuth(handler);
