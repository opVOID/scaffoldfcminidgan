// Test script to verify local metadata functionality
import { fetchBatchLocalMetadata, fetchLocalMetadataWithCache } from './services/localMetadata.js';

async function testLocalMetadata() {
  console.log('Testing local metadata service...');
  
  // Test individual fetch
  try {
    console.log('Testing individual fetch for token #304...');
    const metadata = await fetchLocalMetadataWithCache(304);
    console.log('Metadata for #304:', metadata);
  } catch (error) {
    console.error('Error fetching individual metadata:', error);
  }

  // Test batch fetch
  try {
    console.log('\nTesting batch fetch for tokens #1, #2, #3...');
    const batchMetadata = await fetchBatchLocalMetadata([1, 2, 3]);
    console.log('Batch metadata results:');
    batchMetadata.forEach(nft => {
      console.log(`- Token #${nft.id}: ${nft.name} (${nft.attributes.length} traits)`);
    });
  } catch (error) {
    console.error('Error fetching batch metadata:', error);
  }

  // Test with a token that might not exist locally
  try {
    console.log('\nTesting fetch for non-existent token #99999...');
    const metadata = await fetchLocalMetadataWithCache(99999);
    console.log('Metadata for #99999:', metadata);
  } catch (error) {
    console.error('Error fetching non-existent metadata:', error);
  }
}

// Run the test
testLocalMetadata();
