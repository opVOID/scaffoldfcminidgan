import * as ftp from 'basic-ftp';
import dotenv from 'dotenv';
import { Readable } from 'stream';

// Load environment variables if needed (though we use hardcoded creds for this one-off as requested)
dotenv.config({ path: '.env.local' });

const FTP_CONFIG = {
    host: "ftpupload.net",
    user: "if0_40704407",
    password: "fyoxwSih64IOHcU",
    secure: true,
    secureOptions: { rejectUnauthorized: false } // Common for free hosts
};

const IMAGES_CID = "bafybeigxqxe4wgfddtwjrcghfixzwf3eomnd3w4pzcuee7amndqwgkeqey";
const UPLOAD_DIR = "/htdocs/phunks"; // Standard directadmin/cpanel public folder structure

// Config
const START_ID = 501;
const END_ID = 11306; // Full Collection
const CONCURRENCY = 3; // Keep low for FTP

const client = new ftp.Client();
client.ftp.verbose = true;

async function fetchImage(id) {
    // 1. Try Arweave via API first
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const metaRes = await fetch(`https://api.bastardganpunks.club/${id}`, { signal: controller.signal });
        clearTimeout(timeout);

        if (metaRes.ok) {
            const meta = await metaRes.json();
            if (meta.imageArweave) {
                const arRes = await fetch(meta.imageArweave);
                if (arRes.ok) {
                    return Buffer.from(await arRes.arrayBuffer());
                }
            }
        }
    } catch (e) {
        // Continue to IPFS
    }

    // 2. IPFS Fallback
    const gateways = [
        `https://dweb.link/ipfs/${IMAGES_CID}`,
        `https://cloudflare-ipfs.com/ipfs/${IMAGES_CID}`,
        `https://ipfs.io/ipfs/${IMAGES_CID}`
    ];

    for (const gateway of gateways) {
        try {
            const res = await fetch(`${gateway}/${id}.webp`);
            if (res.ok) {
                return Buffer.from(await res.arrayBuffer());
            }
        } catch (e) { }
    }
    throw new Error(`Failed to fetch image ${id}`);
}

async function uploadBatch() {
    try {
        await client.access(FTP_CONFIG);
        console.log("Connected to FTP");

        await client.ensureDir(UPLOAD_DIR);
        console.log(`Ensured directory ${UPLOAD_DIR}`);

        for (let i = START_ID; i <= END_ID; i++) {
            const id = i;
            try {
                // Check if exists first to skip? (Optional, skipping for speed)
                // console.log(`[${id}] Fetching...`);
                const buffer = await fetchImage(id);

                const source = Readable.from(buffer);
                console.log(`[${id}] Uploading...`);

                await client.uploadFrom(source, `${UPLOAD_DIR}/${id}.webp`);
                console.log(`✅ [${id}] Uploaded`);
            } catch (err) {
                console.error(`❌ [${id}] Failed: ${err.message}`);
            }
        }

    } catch (err) {
        console.error("FTP Error:", err);
    } finally {
        client.close();
    }
}

uploadBatch();
