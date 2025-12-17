import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new Response('Missing ID', { status: 400 });
        }

        const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";

        // 1. Array of Gateways
        // 1. Array of Gateways
        // FTP Host (Free Hosting) is the Source of Truth
        const gateways = [
            `http://www.phunks.fwh.is/phunks/${id}.webp`,
            // Fallbacks
            `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://ipfs.io/ipfs/${IMAGES_CID}/${id}.webp`,
        ];

        // 2. Fetch with Fast Failover
        let imageBuffer: ArrayBuffer | null = null;

        for (const gateway of gateways) {
            try {
                const response = await fetch(gateway, {
                    signal: AbortSignal.timeout(4000) // 4s timeout
                });

                if (response.ok) {
                    imageBuffer = await response.arrayBuffer();
                    console.log(`Fetched image from ${gateway}`);
                    break;
                }
            } catch (err) {
                console.error(`Failed ${gateway}`, err);
                continue;
            }
        }

        // 3. Fallback / Placeholder Logic
        if (!imageBuffer) {
            // Return a generated "Loading" placeholder
            return new ImageResponse(
                (
                    <div
                        style={{
                            height: '100%',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#17182b',
                            color: '#fff',
                            fontSize: 48,
                            fontWeight: 'bold',
                        }}
                    >
                        <div style={{ marginBottom: 20 }}>Bastard DeGAN Phunk #{id}</div>
                        <div style={{ fontSize: 24, color: '#00ff94' }}>Preview Loading...</div>
                    </div>
                ),
                {
                    width: 1080,
                    height: 1080,
                },
            );
        }

        // 4. Serve Raw WebP (Preserve Animation)
        // We do NOT use ImageResponse here because it converts to static PNG.
        return new Response(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (e: any) {
        console.error('Image proxy error:', e);
        // Fallback Error Image via ImageResponse
        return new ImageResponse(
            (
                <div style={{ background: '#17182b', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <div style={{ fontSize: 40, marginBottom: 20 }}>Bastard DeGAN Phunks</div>
                    <div style={{ fontSize: 20, color: '#ff4d4d' }}>Image Unavailable</div>
                </div>
            ),
            { width: 1080, height: 1080 }
        );
    }
}
