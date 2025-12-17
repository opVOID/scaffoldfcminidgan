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
        // Prioritize dweb.link and cloudflare as they are generally faster for images
        const gateways = [
            `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://ipfs.io/ipfs/${IMAGES_CID}/${id}.webp`,
        ];

        // Fetch and proxy the actual image
        let response;

        for (const gateway of gateways) {
            try {
                // Reduced timeout to 5s to fail faster to the next gateway
                response = await fetch(gateway, {
                    signal: AbortSignal.timeout(5000)
                });

                if (response.ok) {
                    console.log(`Serving image from ${gateway}`);
                    break;
                }
            } catch (err) {
                console.error(`Failed to fetch from ${gateway}:`, err);
                continue; // Try next gateway
            }
        }

        if (!response || !response.ok) {
            // Fallback to a hardcoded placeholder if all IPFS fails (prevents broken image icon)
            return Response.redirect('https://fcphunksmini.vercel.app/favicon.webp', 302);
        }

        // Return the image directly with proper headers
        // STREAMING: Pass response.body directly instead of awaiting arrayBuffer()
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (e: any) {
        console.error('Image proxy error:', e);
        return new Response(`Failed to serve image: ${e.message}`, {
            status: 500,
        });
    }
}
