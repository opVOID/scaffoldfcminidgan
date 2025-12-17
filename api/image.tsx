export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new Response('Missing ID', { status: 400 });
        }

        // Hardcoded CID
        const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";

        // Try multiple IPFS gateways for reliability
        const gateways = [
            `https://ipfs.io/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`,
        ];

        // Fetch and proxy the actual image
        let response;

        for (const gateway of gateways) {
            try {
                response = await fetch(gateway, {
                    signal: AbortSignal.timeout(8000) // 8 second timeout
                });

                if (response.ok) {
                    break;
                }
            } catch (err) {
                console.error(`Failed to fetch from ${gateway}:`, err);
                continue; // Try next gateway
            }
        }

        if (!response || !response.ok) {
            return new Response('Failed to fetch image from IPFS', { status: 500 });
        }

        // Get the image data
        const imageData = await response.arrayBuffer();

        // Return the image directly with proper headers
        return new Response(imageData, {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (e) {
        console.error('Image proxy error:', e);
        return new Response(`Failed to serve image: ${e.message}`, {
            status: 500,
        });
    }
}
