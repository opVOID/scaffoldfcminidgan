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

async function inspect() {
    try {
        await client.access(FTP_CONFIG);
        console.log("Connected to FTP");

        // List root
        console.log("Listing /htdocs...");
        const list = await client.list("/htdocs");
        for (const file of list) {
            console.log(`- ${file.name} (${file.size}b)`);
        }

        // Try downloading .htaccess
        try {
            console.log("Downloading .htaccess...");
            await client.downloadTo("ftp_htaccess", "/htdocs/.htaccess");
            console.log("Downloaded .htaccess to local file 'ftp_htaccess'");
        } catch (e) {
            console.log("No .htaccess found or failed to download");
        }

        // Try downloading index.php (often the placeholder)
        try {
            console.log("Downloading index.php...");
            await client.downloadTo("ftp_index.php", "/htdocs/index.php");
            console.log("Downloaded index.php to local file 'ftp_index.php'");
        } catch (e) {
            console.log("No index.php found");
        }

        // Try downloading index2.html (often the placeholder)
        try {
            console.log("Downloading index2.html...");
            await client.downloadTo("ftp_index2.html", "/htdocs/index2.html");
            console.log("Downloaded index2.html to local file 'ftp_index2.html'");
        } catch (e) {
            console.log("No index2.html found");
        }

    } catch (err) {
        console.error("FTP Error:", err);
    } finally {
        client.close();
    }
}

inspect();
