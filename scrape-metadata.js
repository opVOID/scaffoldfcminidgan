#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create metadata directory if it doesn't exist
const metadataDir = path.join(__dirname, 'public/metadata');
if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir, { recursive: true });
}

// IPFS configuration
const IPFS_BASE = 'https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi';

// Scrape JSON files for tokens 1-11305 (or a reasonable range for testing)
async function scrapeMetadata() {
  console.log('Starting metadata scrape...');
  
  // For now, let's scrape tokens 1-100 for testing
  const startToken = 1;
  const endToken = 100;
  
  for (let tokenId = startToken; tokenId <= endToken; tokenId++) {
    const url = `${IPFS_BASE}/${tokenId}.json`;
    const filePath = path.join(metadataDir, `${tokenId}.json`);
    
    try {
      console.log(`Scraping token ${tokenId}...`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const metadata = await response.json();
        
        // Save to local file
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
        console.log(`✅ Saved token ${tokenId} (${metadata.attributes?.length || 0} traits)`);
      } else {
        console.log(`❌ Token ${tokenId} failed: ${response.status}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ Token ${tokenId} error:`, error.message);
    }
  }
  
  console.log(`Scrape complete! Check ${metadataDir} for JSON files.`);
}

// Run the scrape
scrapeMetadata().catch(console.error);
