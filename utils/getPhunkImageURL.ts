export function getPhunkImageURL(tokenId: number): string {
  if (tokenId >= 1 && tokenId <= 5000) {
    return `https://phunks.fwh.is/phunksfirst/${tokenId}.webp`;
  } else if (tokenId >= 5001 && tokenId <= 10000) {
    return `https://phunks.fwh.is/phunkssecond/${tokenId}.webp`;
  } else {
    return "/example.webp"; // optional fallback
  }
}
