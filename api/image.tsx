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

        // 1. Array of Gateways - Priority Order
        const primaryHost = getPhunkImageURL(tokenId);
        const fastGateways = [
            `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}/${id}.webp`,
            `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`,
        ];

        let imageBuffer: ArrayBuffer | null = null;

        // A. Try Primary Host (FTP) with a very short timeout (fast failover)
        try {
            const primaryRes = await fetch(primaryHost, {
                signal: AbortSignal.timeout(1500), // 1.5s max for primary
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            if (primaryRes.ok) {
                const contentType = primaryRes.headers.get('content-type');
                if (contentType && !contentType.includes('text/html')) {
                    imageBuffer = await primaryRes.arrayBuffer();
                    console.log(`Fetched from Primary: ${primaryHost}`);
                }
            }
        } catch (e) {
            console.log("Primary host failed/timed out, trying fast fallbacks...");
        }

        // B. If primary failed, Race Arweave and Cloudflare
        if (!imageBuffer) {
            try {
                // Racing several fast sources
                const fetchSource = async (url: string) => {
                    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
                    if (!res.ok) throw new Error(`Source ${url} failed`);
                    const ct = res.headers.get('content-type');
                    if (ct && ct.includes('text/html')) throw new Error(`Source ${url} returned HTML`);
                    return { buffer: await res.arrayBuffer(), url };
                };

                // Add Arweave to the race by fetching metadata first
                const getArweaveUrl = async () => {
                    const metaRes = await fetch(`https://api.bastardganpunks.club/${id}`, { signal: AbortSignal.timeout(2000) });
                    const meta = await metaRes.json();
                    if (!meta.imageArweave) throw new Error("No Arweave link");
                    return meta.imageArweave;
                };

                const sources = [...fastGateways];
                try {
                    const arUrl = await getArweaveUrl();
                    sources.push(arUrl);
                } catch (e) { /* ignore arweave meta failure */ }

                const result = await Promise.any(sources.map(s => fetchSource(s)));
                imageBuffer = result.buffer;
                console.log(`Fetched from fast source: ${result.url}`);
            } catch (e) {
                console.error("All fast sources failed, trying slow fallback...");
                // Final slow fallback
                try {
                    const slowRes = await fetch(`https://ipfs.io/ipfs/${IMAGES_CID}/${id}.webp`, { signal: AbortSignal.timeout(8000) });
                    if (slowRes.ok) imageBuffer = await slowRes.arrayBuffer();
                } catch (e2) { }
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
