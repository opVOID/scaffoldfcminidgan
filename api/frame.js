export default function handler(request, response) {
    const { nft, name } = request.query;

    // Default values if params are missing
    const imageUrl = nft || 'https://fcphunksmini.vercel.app/example.webp';
    const title = name ? `Minted ${name}` : 'Bastard DeGAN Phunks';
    const appUrl = 'https://fcphunksmini.vercel.app';

    // Construct the Mini App JSON content securely
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

    // Construct the HTML with dynamic meta tags
    // Note: We used to have escaped \${} which broke interpolation. Fixed now.
    const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <meta property="og:title" content="${title}" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${imageUrl}" />
      <meta property="fc:frame:button:1" content="Mint Your Phunk" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="${appUrl}" />
      
      <!-- Mini App Meta Tags -->
      <meta name="fc:miniapp" content='${miniappContent}' />
      
      <!-- Redirect to the main app if opened in a browser -->
      <meta http-equiv="refresh" content="0;url=${appUrl}" />
    </head>
    <body>
      <p>Redirecting to <a href="${appUrl}">Bastard DeGAN Phunks</a>...</p>
    </body>
  </html>`;

    response.setHeader('Content-Type', 'text/html');
    response.status(200).send(html);
}
