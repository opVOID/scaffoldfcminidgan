import { Request, Response } from 'express';
import { getToken, mintToken, getTokensByOwner, getTotalMinted } from '../../../services/db';

// Base IPFS URL pattern - you can have a large collection of pre-generated images
const IPFS_BASE_URL = 'https://ipfs.io/ipfs/bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey';

// Pre-defined image pool
const IMAGE_POOL_SIZE = 11305;

export async function handler(req: Request, res: Response) {
  const tokenId = req.params.tokenId;

  if (req.method === 'GET') {
    return handleGetToken(tokenId, res);
  }

  if (req.method === 'POST') {
    return handleMintToken(req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}


async function handleGetToken(tokenId: string, res: Response) {
  // Check Redis for token existence
  const token = await getToken(tokenId);

  // NOTE: If you want to allow viewing "unminted" images (e.g. preview), comment this out.
  // But strictly speaking, if it's not minted, it shouldn't exist.
  // For "Test Mints" we might relax this or check if ID < TotalSupply.
  if (!token) {
    // Allow implicit existence for low IDs if needed, or strictly 404
    // For now, strict 404 to enforce minting.
    return res.status(404).json({ error: 'Token not minted yet' });
  }

  // Generate image URL dynamically based on token ID
  const imageIndex = (parseInt(tokenId) - 1) % IMAGE_POOL_SIZE;
  const imageUrl = `${IPFS_BASE_URL}/${imageIndex + 1}.webp`;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const imageBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}


async function handleMintToken(req: Request, res: Response) {
  const { owner, quantity = 1 } = req.body;

  if (!owner) return res.status(400).json({ error: 'Owner address required' });
  if (quantity > 10) return res.status(400).json({ error: 'Maximum 10 tokens per mint' });

  try {
    const result = await mintToken(owner, quantity);

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Minting failed' });
    }

    const totalMinted = await getTotalMinted();

    res.status(201).json({
      message: `Successfully minted ${quantity} tokens`,
      tokens: result.tokens,
      totalMinted: totalMinted
    });
  } catch (e: any) {
    console.error("Minting API Error:", e);
    res.status(500).json({ error: e.message });
  }
}

// Export helpers for use in other parts of the app if necessary
export { getTokensByOwner, getTotalMinted };
