export default async function handler(req, res) {
    try {
        // 1. Get Token ID from Query (rewritten from /share/:id)
        const { id } = req.query;

        // Fallback if accessed without ID or invalid
        if (!id) {
            return res.redirect(302, 'https://fcphunksmini.vercel.app');
        }

        // USER PROVIDED IMAGES CID
        const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";
        const appUrl = 'https://fcphunksmini.vercel.app';

        // Construct the Direct Image URL (WebP) using dweb.link for performance
        // We use dweb.link instead of ipfs.io because it handles social card previews significantly better.
        const imageUrl = `https://dweb.link/ipfs/${IMAGES_CID}/${id}.webp`;

        // Default name if we can't fetch metadata (Optimistic rendering)
        let nftName = `Bastard DeGAN Phunk #${id}`;

        // Optional: Still try to fetch metadata for the correct Name, but don't block image on it
        try {
            const METADATA_CID = "bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi";
            const metadataUrl = `https://dweb.link/ipfs/${METADATA_CID}/${id}.json`;
            const metadataRes = await fetch(metadataUrl, { signal: AbortSignal.timeout(2000) }); // Fast timeout
            if (metadataRes.ok) {
                const json = await metadataRes.json();
                if (json.name) nftName = json.name;
            }
        } catch (e) {
            // Ignore metadata fetch error, we have the image and ID
        }


        /* ----------------------------------------------------
           3. Logic: Bot vs Human
           ---------------------------------------------------- */
        const ua = req.headers['user-agent'] || '';
        // Expanded bot list for maximum coverage
        const isBot = /discord|twitter|bot|crawler|facebot|slackbot|farcaster|telegram|whatsapp|facebook|meta/i.test(ua);

        if (isBot) {
            // Serve HTML for Bots
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
            // Aggressive caching since the image CID is permanent/pinned
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

            return res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${nftName}</title>
            <meta property="og:title" content="${nftName}" />
            <meta property="og:description" content="Minted on FCPhunks Mini. The based Phunks on Base." />
            <meta property="og:image" content="${imageUrl}" />
            <meta property="og:url" content="${appUrl}/share/${id}" />
            <meta name="twitter:card" content="summary_large_image" />
    
            <!-- Farcaster Frame Tags -->
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${imageUrl}" />
            <meta property="fc:frame:image:aspect_ratio" content="1:1" />
            
            <meta property="fc:frame:button:1" content="Mint Your Phunk" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="${appUrl}" />
            
            <meta name="fc:miniapp" content='${safeMiniappContent}' />
          </head>
          <body>
            <h1>${nftName}</h1>
            <img src="${imageUrl}" alt="${nftName}" />
          </body>
        </html>
        `);
        } else {
            // Redirect Humans to the App
            res.writeHead(302, { Location: appUrl });
            return res.end();
        }

    } catch (error) {
        console.error("API Share Error:", error);
        // Recover gracefully
        res.writeHead(302, { Location: 'https://fcphunksmini.vercel.app' });
        return res.end();
    }
}
