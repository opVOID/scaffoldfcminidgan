import { NFT } from '../types';

// Local metadata service that fetches from downloaded JSON files
export const fetchLocalMetadata = async (tokenId: number): Promise<NFT | null> => {
  try {
    // Try to fetch from local metadata files first
    const localUrl = `/metadata/${tokenId}.json`;
    
    try {
      const response = await fetch(localUrl);
      if (response.ok) {
        const json = await response.json();
        
        const isAnimated = json.attributes?.some(
          (attr: any) => attr.trait_type === "HYPE TYPE" && attr.value === "HYPED AF (ANIMATED)"
        );

        let imageUrl = json.image || '';
        if (imageUrl.startsWith('ipfs://')) {
          imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }

        return {
          id: tokenId.toString(),
          name: json.name,
          image: imageUrl,
          description: json.description,
          attributes: json.attributes || [],
          isAnimated: !!isAnimated
        };
      }
    } catch (localError) {
      console.warn(`Local metadata not found for token ${tokenId}, trying remote...`);
    }

    // Fallback to remote IPFS if local fails
    return await fetchRemoteMetadata(tokenId);
  } catch (error) {
    console.error(`Error fetching metadata for token ${tokenId}:`, error);
    return null;
  }
};

// Remote metadata fallback
const fetchRemoteMetadata = async (tokenId: number): Promise<NFT | null> => {
  try {
    const gateways = [
      `https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${tokenId}.json`,
      `https://dweb.link/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${tokenId}.json`,
      `https://gateway.pinata.cloud/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi/${tokenId}.json`
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway);
        if (response.ok) {
          const json = await response.json();
          
          const isAnimated = json.attributes?.some(
            (attr: any) => attr.trait_type === "HYPE TYPE" && attr.value === "HYPED AF (ANIMATED)"
          );

          let imageUrl = json.image || '';
          if (imageUrl.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }

          return {
            id: tokenId.toString(),
            name: json.name,
            image: imageUrl,
            description: json.description,
            attributes: json.attributes || [],
            isAnimated: !!isAnimated
          };
        }
      } catch (gatewayError) {
        console.warn(`Gateway ${gateway} failed for token ${tokenId}`);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching remote metadata for token ${tokenId}:`, error);
    return null;
  }
};

// Batch fetch metadata for multiple token IDs (optimized for mint previews)
export const fetchBatchLocalMetadata = async (tokenIds: number[]): Promise<NFT[]> => {
  const results: NFT[] = [];
  
  // Process in parallel batches to avoid overwhelming the system
  const batchSize = 5;
  for (let i = 0; i < tokenIds.length; i += batchSize) {
    const batch = tokenIds.slice(i, i + batchSize);
    const batchPromises = batch.map(tokenId => fetchLocalMetadata(tokenId));
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else {
          // Create fallback NFT if metadata fails
          const tokenId = batch[index];
          results.push({
            id: tokenId.toString(),
            name: `Bastard DeGAN Phunk #${tokenId}`,
            image: `https://fcphunksmini.vercel.app/token/${tokenId}.webp`,
            description: `Bastard DeGAN Phunk #${tokenId} - Minted on Base chain`,
            attributes: [],
            isAnimated: false
          });
        }
      });
    } catch (error) {
      console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  return results;
};

// Cache for local metadata to avoid repeated file reads
const localMetadataCache = new Map<number, NFT>();

export const fetchLocalMetadataWithCache = async (tokenId: number): Promise<NFT | null> => {
  // Check cache first
  if (localMetadataCache.has(tokenId)) {
    return localMetadataCache.get(tokenId)!;
  }

  const metadata = await fetchLocalMetadata(tokenId);
  
  // Cache the result (even if null, to avoid repeated failed requests)
  localMetadataCache.set(tokenId, metadata || null as any);
  
  return metadata;
};
