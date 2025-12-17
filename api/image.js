import { getPhunkImageURL } from '../utils/getPhunkImageURL.js';

export default async function handler(req, res) {
    try {
        const { id } = req.query;
        const tokenId = parseInt(id) || 1;
        
        // Use the folder-aware helper function
        const imageUrl = getPhunkImageURL(tokenId);
        
        // Fetch the image and proxy it
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Stream the image response
        const imageBuffer = await response.arrayBuffer();
        res.send(Buffer.from(imageBuffer));
        
    } catch (error) {
        console.error("Image API Error:", error);
        
        // Fallback to a default image
        try {
            const fallbackResponse = await fetch('/example.webp');
            if (fallbackResponse.ok) {
                const fallbackBuffer = await fallbackResponse.arrayBuffer();
                res.setHeader('Content-Type', 'image/webp');
                res.send(Buffer.from(fallbackBuffer));
                return;
            }
        } catch (fallbackError) {
            console.error("Fallback image also failed:", fallbackError);
        }
        
        res.writeHead(404);
        res.end("Image not found");
    }
}
