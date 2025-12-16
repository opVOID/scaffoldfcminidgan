
export const config = {
  runtime: 'edge',
};

// Helper to escape HTML characters to prevent XSS and attribute breakage
function escapeHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const nft = url.searchParams.get('nft');
    const name = url.searchParams.get('name');

    // Default values if params are missing
    const rawImageUrl = nft || 'https://fcphunksmini.vercel.app/example.webp';
    const rawTitle = name ? `Minted ${name}` : 'Bastard DeGAN Phunks';
    const appUrl = 'https://fcphunksmini.vercel.app';

    // Sanitize inputs for HTML
    const imageUrl = escapeHtml(rawImageUrl);
    const title = escapeHtml(rawTitle);

    // Construct the Mini App JSON content securely
    // We must ensure the JSON string doesn't break the single-quoted content attribute
    const miniappContent = JSON.stringify({
      version: "1",
      imageUrl: rawImageUrl, // JSON.stringify handles quotes inside the value
      button: {
        title: "Mint Your Phunk",
        action: {
          type: "launch_miniapp",
          name: "Bastard DeGAN Phunks",
          url: appUrl,
          splashImageUrl: rawImageUrl,
          splashBackgroundColor: "#17182b"
        }
      }
    });

    // Safety: Escape any single quotes in the stringified JSON to prevent attribute breakout
    const safeMiniappContent = miniappContent.replace(/'/g, "&apos;");

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
        <meta name="fc:miniapp" content='${safeMiniappContent}' />
        
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
        'Cache-Control': 'public, max-age=60', // Cache for 60s
      },
    });
  } catch (error) {
    console.error('Frame Error:', error);
    return new Response(`<!DOCTYPE html><html><body><h1>Error generating frame</h1><p>${error instanceof Error ? error.message : 'Unknown error'}</p></body></html>`, {
      status: 200, // Return 200 even on error to show message in preview if possible, though generic 500 is likely from Vercel platform if we crash hard.
      headers: { 'content-type': 'text/html' },
    });
  }
}
