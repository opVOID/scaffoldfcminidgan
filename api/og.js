export default async function handler(req, res) {
    try {
        // 1. Parse Parameters (Robust Fallback)
        let nft, name, balance;
        if (req.query && req.query.nft) {
            nft = req.query.nft;
            name = req.query.name;
        } else if (req.url) {
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            nft = urlObj.searchParams.get('nft');
            name = urlObj.searchParams.get('name');
        }

        // 2. Default Values
        const rawImageUrl = nft || 'https://fcphunksmini.vercel.app/example.webp';
        const title = name ? `Minted ${name}` : 'Bastard DeGAN Phunks';
        // appUrl must be absolute
        const appUrl = 'https://fcphunksmini.vercel.app';

        // 3. Optimize Image URL (Use dweb.link for reliable previews)
        let imageUrl = rawImageUrl;
        if (imageUrl.includes('ipfs.io/ipfs/')) {
            imageUrl = imageUrl.replace('ipfs.io/ipfs/', 'https://dweb.link/ipfs/');
        }
        // Ensure absolute protocol
        if (imageUrl.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', 'https://dweb.link/ipfs/');
        }

        // 4. Construct Mini App JSON
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
        // Sanitize quotes for HTML attribute
        const safeMiniappContent = miniappContent.replace(/'/g, "&apos;");

        // 5. Serve Static HTML with Metatags (Node Style res.end)
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 60s

        return res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="Check out ${title} minted on FCPhunks Mini!" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="${appUrl}" />
        <meta name="twitter:card" content="summary_large_image" />

        <!-- Farcaster Frame Tags -->
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        <meta property="fc:frame:button:1" content="Mint Your Phunk" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${appUrl}" />
        
        <!-- Farcaster Mini App Tag -->
        <meta name="fc:miniapp" content='${safeMiniappContent}' />
        
        <!-- Redirect to the NFT Image (IPFS/Dweb) for direct preview -->
        <meta http-equiv="refresh" content="0;url=${imageUrl}" />
      </head>
      <body>
        <p>Redirecting to <a href="${imageUrl}">your Phunk...</a></p>
      </body>
    </html>
    `);

    } catch (error) {
        console.error("API OG Error:", error);
        res.setHeader('Content-Type', 'text/html');
        return res.end(`<!DOCTYPE html><html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
    }
}
