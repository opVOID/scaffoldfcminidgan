import { Request, Response } from 'express';


// Mock database - in production this would be a real database
let mintedTokens: Array<{id: string, owner: string, timestamp: number}> = [];
let nextTokenId = 1;


// Base IPFS URL pattern - you can have a large collection of pre-generated images
const IPFS_BASE_URL = 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey';


// Pre-defined image pool (you could have thousands of these)
const IMAGE_POOL_SIZE = 11305; // Adjust based on your collection size


export async function handler(req: Request, res: Response) {
  const tokenId = req.params.tokenId;
  
  // Handle GET request - return image for existing token
  if (req.method === 'GET') {
    return handleGetToken(tokenId, res);
  }
  
  // Handle POST request - mint new token (mock implementation)
  if (req.method === 'POST') {
    return handleMintToken(req, res);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}


async function handleGetToken(tokenId: string, res: Response) {
  // Check if token exists
  const token = mintedTokens.find(t => t.id === tokenId);
  
  if (!token) {
    return res.status(404).json({ error: 'Token not found' });
  }
  
  // Generate image URL dynamically based on token ID
  // This cycles through your image pool based on token ID
  const imageIndex = (parseInt(tokenId) - 1) % IMAGE_POOL_SIZE;
  const imageUrl = ${IPFS_BASE_URL}/${imageIndex + 1}.webp;
  
  try {
    // Fetch the image from IPFS
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(Failed to fetch image: ${response.statusText});
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    // Set proper headers for image response
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    // Return the image buffer
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}


async function handleMintToken(req: Request, res: Response) {
  const { owner, quantity = 1 } = req.body;
  
  if (!owner) {
    return res.status(400).json({ error: 'Owner address required' });
  }
  
  if (quantity > 10) {
    return res.status(400).json({ error: 'Maximum 10 tokens per mint' });
  }
  
  const newlyMintedTokens = [];
  
  // Mint new tokens with unique IDs
  for (let i = 0; i < quantity; i++) {
    const newToken = {
      id: nextTokenId.toString(),
      owner,
      timestamp: Date.now()
    };
    
    mintedTokens.push(newToken);
    newlyMintedTokens.push(newToken);
    nextTokenId++;
  }
  
  res.status(201).json({
    message: Successfully minted ${quantity} tokens,
    tokens: newlyMintedTokens,
    totalMinted: mintedTokens.length
  });
}


// Helper function to get all tokens for an owner
export async function getTokensByOwner(owner: string) {
  return mintedTokens.filter(token => token.owner === owner);
}


// Helper function to get total supply
export async function getTotalSupply() {
  return mintedTokens.length;
}
