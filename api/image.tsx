import { ImageResponse } from '@vercel/og';
import { getPhunkImageURL } from '../utils/getPhunkImageURL';

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

        const tokenId = parseInt(id);
        const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";

        // 1. Array of Gateways - Use folder-aware URL first
        const gateways = [
            getPhunkImageURL(tokenId), // Use our helper for phunksfirst/phunkssecond
            // Fallbacks
            `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://ipfs.io/ipfs/${IMAGES_CID}/${id}.webp`,
        ];

        // 2. Fetch with Fast Failover
        let imageBuffer: ArrayBuffer | null = null;

        // A. Try FTP First
        for (const gateway of gateways) {
            try {
                const response = await fetch(gateway, {
                    signal: AbortSignal.timeout(8000), // Increased to 8s
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
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

        // B. Try Bastard GAN Punks API (Arweave) if FTP failed
        if (!imageBuffer) {
            try {
                // Fetch metadata to get Arweave URL
                const metaRes = await fetch(`https://api.bastardganpunks.club/${id}`, { signal: AbortSignal.timeout(3000) });
                if (metaRes.ok) {
                    const meta = await metaRes.json();
                    if (meta.imageArweave) {
                        const arRes = await fetch(meta.imageArweave, { signal: AbortSignal.timeout(8000) });
                        if (arRes.ok) {
                            imageBuffer = await arRes.arrayBuffer();
                            console.log(`Fetched image from Arweave: ${meta.imageArweave}`);
                        }
                    }
                }
            } catch (e) {
                console.error("Arweave Fetch Failed", e);
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
