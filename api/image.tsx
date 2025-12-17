import { ImageResponse } from '@vercel/og';

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
        const imageUrl = `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`;

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        height: '100%',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#17182b', // Phunks dark bg
                    }}
                >
                    {/* We use an img tag to render the remote external image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt={`Phunk #${id}`}
                        width="100%"
                        height="100%"
                        style={{
                            objectFit: 'contain'
                        }}
                    />
                </div>
            ),
            {
                width: 1080, // Square as per standard NFT
                height: 1080,
                headers: {
                    'Cache-Control': 'public, max-age=31536000, immutable',
                }
            },
        );
    } catch (e) {
        console.error(e);
        return new Response(`Failed to generate image`, {
            status: 500,
        });
    }
}
