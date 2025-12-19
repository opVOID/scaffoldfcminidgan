import { list, del, BlobServiceRateLimited } from '@vercel/blob';
import { setTimeout } from 'node:timers/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function deleteAllBlobs() {
  let cursor: string | undefined;
  let totalDeleted = 0;

  // Batch size to respect rate limits (conservative approach)
  const BATCH_SIZE = 100; // Conservative batch size
  const DELAY_MS = 1000; // 1 second delay between batches

  do {
    const listResult = await list({
      cursor,
      limit: BATCH_SIZE,
    });

    if (listResult.blobs.length > 0) {
      const batchUrls = listResult.blobs.map((blob) => blob.url);

      // Retry logic with exponential backoff
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          await del(batchUrls);
          totalDeleted += listResult.blobs.length;
          console.log(
            `Deleted ${listResult.blobs.length} blobs (${totalDeleted} total)`,
          );
          break; // Success, exit retry loop
        } catch (error) {
          retries++;

          if (retries > maxRetries) {
            console.error(
              `Failed to delete batch after ${maxRetries} retries:`,
              error,
            );
            throw error; // Re-throw after max retries
          }

          // Exponential backoff: wait longer with each retry
          let backoffDelay = 2 ** retries * 1000;

          if (error instanceof BlobServiceRateLimited) {
            backoffDelay = error.retryAfter * 1000;
          }

          console.warn(
            `Retry ${retries}/${maxRetries} after ${backoffDelay}ms delay`,
          );

          await setTimeout(backoffDelay);
        }

        await setTimeout(DELAY_MS);
      }
    }

    cursor = listResult.cursor;
  } while (cursor);

  console.log(`All blobs were deleted. Total: ${totalDeleted}`);
}

deleteAllBlobs().catch((error) => {
  console.error('An error occurred:', error);
});