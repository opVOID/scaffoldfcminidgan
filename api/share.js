export default async function handler(req, res) {
    try {
        // 1. Get Token ID from Query (rewritten from /og/:id)
        const { id } = req.query;

        // Fallback if accessed without ID or invalid
        if (!id) {
            return res.redirect(302, 'https://fcphunksmini.vercel.app');
        }

        const METADATA_CID = "bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi";
        const appUrl = 'https://fcphunksmini.vercel.app';
        const cleanFields = {
            name: `Bastard DeGAN Phunk #${id}`,
            image: `https://fcphunksmini.vercel.app/example.webp` // Default fallback
        };

        // 2. Fetch Metadata from IPFS Gateway
        try {
            // Use dweb.link for reliable JSON fetching
            const metadataUrl = `https://dweb.link/ipfs/${METADATA_CID}/${id}.json`;
            const metadataRes = await fetch(metadataUrl, { signal: AbortSignal.timeout(4000) }); // 4s timeout

            if (metadataRes.ok) {
                const json = await metadataRes.json();

                if (json.name) cleanFields.name = json.name;
                if (json.image) {
                    // Convert ipfs:// to dweb.link
                    let img = json.image;
                    if (img.startsWith('ipfs://')) {
                        img = img.replace('ipfs://', 'https://dweb.link/ipfs/');
                    } else if (img.includes('ipfs.io/ipfs/')) {
                        img = img.replace('ipfs.io/ipfs/', 'dweb.link/ipfs/');
                    }
                    cleanFields.image = img;
                }
            } else {
                console.warn(`Failed to fetch metadata for ${id} from IPFS`);
            }
        } catch (e) {
            console.error("IPFS Fetch Error:", e);
            // Continue with fallback/default fields so we don't crash
        }


        /* ----------------------------------------------------
           3. Logic: Bot vs Human
           ---------------------------------------------------- */
        const ua = req.headers['user-agent'] || '';
        const isBot = /discord|twitter|bot|crawler|facebot|slackbot|farcaster|telegram/i.test(ua);

        if (isBot) {
            // Serve HTML for Bots
            const miniappContent = JSON.stringify({
                version: "1",
                imageUrl: cleanFields.image,
                button: {
                    title: "Mint Your Phunk",
                    action: {
                        type: "launch_miniapp",
                        name: "Bastard DeGAN Phunks",
                        url: appUrl,
                        splashImageUrl: cleanFields.image,
                        splashBackgroundColor: "#17182b"
                    }
                }
            });
            const safeMiniappContent = miniappContent.replace(/'/g, "&apos;");

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Valid since metadata is immutable per ID usually

            return res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${cleanFields.name}</title>
            <meta property="og:title" content="${cleanFields.name}" />
            <meta property="og:description" content="Minted on FCPhunks Mini. The based Phunks on Base." />
            <meta property="og:image" content="${cleanFields.image}" />
            <meta property="og:url" content="${appUrl}/share/${id}" />
            <meta name="twitter:card" content="summary_large_image" />
    
            <!-- Farcaster Frame Tags -->
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${cleanFields.image}" />
            <meta property="fc:frame:image:aspect_ratio" content="1:1" />
            
            <meta property="fc:frame:button:1" content="Mint Your Phunk" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="${appUrl}" />
            
            <meta name="fc:miniapp" content='${safeMiniappContent}' />
          </head>
          <body>
            <h1>${cleanFields.name}</h1>
            <img src="${cleanFields.image}" alt="Phunk #${id}" />
          </body>
        </html>
        `);
        } else {
            // Redirect Humans to the App
            // Optionally redirect to a specific viewing page if you have one, e.g. /?id=${id}
            // For now, redirecting to home as requested by strict interpretation.
            res.writeHead(302, { Location: appUrl });
            return res.end();
        }

    } catch (error) {
        console.error("API OG Global Error:", error);
        // Recover gracefully
        res.writeHead(302, { Location: 'https://fcphunksmini.vercel.app' });
        return res.end();
    }
}
