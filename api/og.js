export default function handler(req, res) {
    try {
        const { nft, name } = req.query;

        // Default values if params are missing
        const imageUrl = nft || 'https://fcphunksmini.vercel.app/example.webp';
        const title = name ? `Minted ${name}` : 'Bastard DeGAN Phunks';
        const appUrl = 'https://fcphunksmini.vercel.app';

        // Construct the Mini App JSON content
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

        // Valid HTML with Meta Tags
        // fc:frame:button:1 must be 'link' type to open the Mini App URL or external link
        // But for a Mini App, we usually want to launch the miniapp.
        // However, 'link' with target=appUrl is the most reliable way to open the app from a frame.
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
        
        <meta property="fc:frame:button:1" content="Mint Your Phunk" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="${appUrl}" />
        
        <meta name="fc:miniapp" content='${miniappContent.replace(/'/g, "&apos;")}' />
        
        <meta http-equiv="refresh" content="0;url=${appUrl}" />
      </head>
      <body>
        <p>Redirecting to <a href="${appUrl}">Bastard DeGAN Phunks</a>...</p>
      </body>
    </html>`;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}
