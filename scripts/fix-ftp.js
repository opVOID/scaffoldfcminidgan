import * as ftp from 'basic-ftp';
import fs from 'fs';

const FTP_CONFIG = {
    host: "ftpupload.net",
    user: "if0_40704407",
    password: "fyoxwSih64IOHcU",
    secure: true,
    secureOptions: { rejectUnauthorized: false }
};

const client = new ftp.Client();
client.ftp.verbose = true;

async function fix() {
    try {
        await client.access(FTP_CONFIG);
        console.log("Connected to FTP");

        // 1. Delete index2.html
        try {
            console.log("Deleting index2.html...");
            await client.remove("/htdocs/index2.html");
            console.log("Deleted index2.html");
        } catch (e) {
            console.log("index2.html not found/already deleted");
        }

        // 2. Upload .htaccess
        try {
            console.log("Uploading .htaccess...");
            await client.uploadFrom("ftp_htaccess", "/htdocs/.htaccess");
            console.log("Uploaded .htaccess");
        } catch (e) {
            console.error("Failed to upload .htaccess", e);
        }

        // 3. Upload silent index.php to root (to prevent directory listing or 403 on root)
        try {
            fs.writeFileSync("ftp_index.php", "<?php // Silence is golden ?>");
            console.log("Uploading index.php...");
            await client.uploadFrom("ftp_index.php", "/htdocs/index.php");
            console.log("Uploaded index.php");
        } catch (e) {
            console.error("Failed to upload index.php", e);
        }

    } catch (err) {
        console.error("FTP Error:", err);
    } finally {
        client.close();
    }
}

fix();
