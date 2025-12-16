export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  const url = new URL(request.url);
  const nft = url.searchParams.get('nft');
  const name = url.searchParams.get('name');

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
      
      <!-- Button to Launch Mini App -->
      <meta property="fc:frame:button:1" content="Mint Your Phunk" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="${appUrl}" />
      
      <!-- Mini App Meta Tags (for direct deep linking support) -->
      <meta name="fc:miniapp" content='${miniappContent}' />
      
      <!-- Redirect to the main app if opened in a browser -->
      <meta http-equiv="refresh" content="0;url=${appUrl}" />
    </head>
    <body>
      <p>Redirecting to <a href="${appUrl}">Bastard DeGAN Phunks</a>...</p>
    </body>
  </html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html',
    },
  });
}
