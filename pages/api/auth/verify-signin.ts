import { Request, Response } from 'express';
import { verifyAuth } from '../../../services/auth';

export interface VerifySignInRequest {
  message: string;
  signature: string;
  nonce: string;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, signature, nonce } = req.body as Partial<VerifySignInRequest>;
    
    // Validate request body
    if (!message || !signature || !nonce) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['message', 'signature', 'nonce']
      });
    }

    // In a real implementation, you would verify the signature here
    // For now, we'll just verify the auth header
    const authHeader = req.headers.authorization;
    const user = await verifyAuth(authHeader);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ 
      success: true,
      user: {
        fid: user.fid
      }
    });
  } catch (error) {
    console.error('Verify Sign In Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
