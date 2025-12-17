export default function handler(req, res) {
    try {
        let nft, name, balance;

        // Robust Parameter Parsing:
        // 1. Try standard req.query (Vercel/Next)
        if (req.query) {
            nft = req.query.nft;
            name = req.query.name;
        }
        // 2. Fallback to manual URL parsing (Raw Node)
        if (!nft && req.url) {
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            nft = urlObj.searchParams.get('nft');
            name = urlObj.searchParams.get('name');
        }

        // Default values if params are missing
        const rawImageUrl = nft || 'https://fcphunksmini.vercel.app/example.webp';
        const title = name ? `Minted ${name}` : 'Bastard DeGAN Phunks';
        const appUrl = 'https://fcphunksmini.vercel.app';

        // Ensure we use a reliable gateway for the image preview
        // If it's an ipfs.io link, swap to dweb.link which is often better for social cards
        let imageUrl = rawImageUrl;
        if (imageUrl.includes('ipfs.io/ipfs/')) {
            imageUrl = imageUrl.replace('ipfs.io/ipfs/', 'dweb.link/ipfs/');
        }

        // Construct the Mini App JSON content
        // We explicitly use the 'imageUrl' for the splash screen too
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

        // HTML Output
        const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="og:image" content="${imageUrl}" />
        
        <!-- Farcaster Frame Meta Tags -->
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        
        <!-- Interactive Button -->
        <meta property="fc:frame:button:1" content="Mint Your Phunk" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${appUrl}" />
        
        <!-- Mini App Deep Link -->
        <meta name="fc:miniapp" content='${safeMiniappContent}' />
        
        <meta http-equiv="refresh" content="0;url=${appUrl}" />
      </head>
      <body>
        <p>Redirecting to <a href="${appUrl}">Bastard DeGAN Phunks</a>...</p>
      </body>
    </html>`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 60s
        res.status(200).send(html);

    } catch (error) {
        console.error("API OG Error:", error);
        // Return 200 with error info so it renders and we can see what happened
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(`<!DOCTYPE html><html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
    }
}
