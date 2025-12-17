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
        const gateways = [
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

        // 4. Optimize & Serve
        // Use ImageResponse to resize/format the raw buffer
        // standardizing it to 1080x1080 WebP/PNG
        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        height: '100%',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#17182b',
                    }}
                >
                    <img
                        src={imageBuffer as any}
                        style={{
                            height: '100%',
                            width: '100%',
                            objectFit: 'cover',
                        }}
                    />
                </div>
            ),
            {
                width: 1080,
                height: 1080,
                headers: {
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            },
        );

    } catch (e: any) {
        console.error('Image proxy error:', e);
        // Fallback Error Image
        return new ImageResponse(
            (
                <div style={{ background: 'red', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 60 }}>
                    Error Loading Image
                </div>
            ),
            { width: 1080, height: 1080 }
        );
    }
}
