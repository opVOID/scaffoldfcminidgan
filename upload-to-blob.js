import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Error: BLOB_READ_WRITE_TOKEN is missing in .env.local');
    process.exit(1);
}

const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";
const IPFS_GATEWAYS = [
    `https://dweb.link/ipfs/${IMAGES_CID}`,
    `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}`,
    `https://ipfs.io/ipfs/${IMAGES_CID}`
];

// Configuration
const START_ID = 501;
const END_ID = 11306; // Increase this as needed
const CONCURRENCY = 10;

async function fetchImage(id) {
    // 1. Try Bastard GAN Punks API for Arweave (Faster/Reliable)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const metaRes = await fetch(`https://api.bastardganpunks.club/${id}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (metaRes.ok) {
            const meta = await metaRes.json();
            if (meta.imageArweave) {
                // console.log(`[${id}] Found Arweave: ${meta.imageArweave}`);
                const arRes = await fetch(meta.imageArweave);
                if (arRes.ok) {
                    return await arRes.blob();
                }
            }
        }
    } catch (e) {
        // console.warn(`[${id}] Arweave check failed, falling back to IPFS`);
    }

    // 2. Fallback to IPFS Gateways
    for (const gateway of IPFS_GATEWAYS) {
        try {
            const url = `${gateway}/${id}.webp`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                return await res.blob();
            }
        } catch (e) {
            // Ignore and try next
        }
    }
    throw new Error(`Could not fetch image for ID ${id}`);
}

async function uploadToken(id) {
    try {
        // console.log(`[${id}] Fetching image...`);
        const blob = await fetchImage(id);

        // console.log(`[${id}] Uploading to Blob...`);
        const { url } = await put(`phunks/${id}.webp`, blob, {
            access: 'public',
            addRandomSuffix: false, // Ensures overwrite/deterministic URL
        });

        console.log(`✅ [${id}] Uploaded: ${url}`);
        return true;
    } catch (error) {
        console.error(`❌ [${id}] Failed:`, error.message);
        return false;
    }
}

async function main() {
    console.log(`Starting upload for IDs ${START_ID} to ${END_ID}...`);

    // Process in chunks
    for (let i = START_ID; i <= END_ID; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && i + j <= END_ID; j++) {
            batch.push(uploadToken(i + j));
        }
        await Promise.all(batch);
    }

    console.log('Upload complete!');
}

main();