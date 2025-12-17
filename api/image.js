export default async function handler(req, res) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).send("Missing ID");
        }

        // Hardcoded CID for image source
        const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";
        // We fetch from dweb.link, but verify availability
        const targetUrl = `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`;

        const response = await fetch(targetUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        // Proxy the image content type
        res.setHeader('Content-Type', 'image/webp');
        // Aggressive Caching (1 year, immutable) - This is the "Magic" for fast social previews
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        // Pipe the image buffer to the response
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.status(200).send(buffer);

    } catch (error) {
        console.error("Image Proxy Error:", error);
        res.status(500).send("Failed to load image");
    }
}
