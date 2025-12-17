export default async function handler(req, res) {
    try {
        // 1. Parse Parameters via robust fallback
        let nft, name;
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
        const appUrl = 'https://fcphunksmini.vercel.app';

        // 3. Optimize Image URL (Use dweb.link for reliable previews)
        let imageUrl = rawImageUrl;
        if (imageUrl.includes('ipfs.io/ipfs/')) {
            imageUrl = imageUrl.replace('ipfs.io/ipfs/', 'https://dweb.link/ipfs/');
        }
        if (imageUrl.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', 'https://dweb.link/ipfs/');
        }

        // 4. User-Agent Detection
        const ua = req.headers['user-agent'] || '';
        const isBot = /discord|twitter|bot|crawler|facebot|slackbot|farcaster/i.test(ua);

        if (isBot) {
            // 5a. Serve HTML with Meta Tags for Bots/Scrapers

            // Construct Mini App JSON
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

            res.setHeader('Content-Type', 'text/html');
            // Cache heavily for bots
            res.setHeader('Cache-Control', 'public, max-age=3600');

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
          </head>
          <body>
            <h1>${title}</h1>
            <img src="${imageUrl}" alt="${title}" />
          </body>
        </html>
        `);
        } else {
            // 5b. Redirect Humans to the Main App
            // This ensures users landing on this link go to the app, not a raw metadata page.
            res.writeHead(302, { Location: appUrl });
            return res.end();
        }

    } catch (error) {
        console.error("API OG Error:", error);
        // Even on error, try to redirect humans to home if possible
        res.writeHead(302, { Location: 'https://fcphunksmini.vercel.app' });
        return res.end();
    }
}
