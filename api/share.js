export default async function handler(req, res) {
    try {
        const { id } = req.query;
        const shareId = id || '1';

        // 1. Construct Image URL (Using the efficient proxy)
        const imageUrl = `https://fcphunksmini.vercel.app/api/image?id=${shareId}`;
        const appUrl = 'https://fcphunksmini.vercel.app';
        let nftName = `Bastard DeGAN Phunk #${shareId}`;

        // 2. Mini App Data
        const miniappContent = JSON.stringify({
            version: "1",
            imageUrl: imageUrl,
            button: {
                title: "Mint Your Phunk",
                action: {
                    type: "launch_miniapp",
                    name: "Bastard DeGAN Phunks",
                    url: appUrl,
                    splashImageUrl: imageUrl,
                    splashBackgroundColor: "#17182b"
                }
            }
        });
        const safeMiniappContent = miniappContent.replace(/'/g, "&apos;");

        // 3. Serve Visible HTML Page (No Redirect)
        res.setHeader('Content-Type', 'text/html');
        // Cache HTML for 1 hour, since the image proxy handles the heavy lifting
        res.setHeader('Cache-Control', 'public, max-age=3600');

        return res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${nftName}</title>
            <meta property="og:title" content="${nftName}" />
            <meta property="og:description" content="Minted on FCPhunks Mini. Verify this Phunk on Base." />
            
            <!-- Robust Image Tags -->
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:image:type" content="image/webp" />
            <meta property="og:image:width" content="1080" />
            <meta property="og:image:height" content="1080" />
            
            <meta property="og:url" content="${appUrl}/share/${shareId}" />
            <meta name="twitter:card" content="summary_large_image" />
    
            <!-- Farcaster Frame Tags -->
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${imageUrl}" />
            <meta property="fc:frame:image:aspect_ratio" content="1:1" />
            <meta property="fc:frame:button:1" content="Mint Your Phunk" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="${appUrl}?id=${shareId}" />
            <meta name="fc:miniapp" content='${safeMiniappContent}' />

            <style>
                body {
                    background-color: #17182b;
                    color: white;
                    font-family: system-ui, -apple-system, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                img {
                    max-width: 90%;
                    max-height: 70vh;
                    border-radius: 12px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
                    margin-bottom: 20px;
                }
                .btn {
                    background-color: #7C3AED;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: bold;
                    transition: transform 0.2s;
                }
                .btn:hover {
                    transform: scale(1.05);
                }
                h1 { margin-bottom: 8px; font-size: 1.5rem; }
                p { color: #aaa; margin-bottom: 24px; }
            </style>
          </head>
          <body>
            <h1>${nftName}</h1>
            <a href="${imageUrl}" target="_blank">
                <img src="${imageUrl}" alt="${nftName}" />
            </a>
            <p>Recently minted on Base.</p>
            <a href="${appUrl}?id=${shareId}" class="btn">Mint Your Phunk</a>
          </body>
        </html>
        `);

    } catch (error) {
        console.error("API Share Error:", error);
        res.writeHead(500);
        res.end("Internal Error");
    }
}
