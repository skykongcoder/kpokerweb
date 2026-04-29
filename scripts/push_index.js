import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';

const keyPath = 'c:\\Users\\ainst\\Downloads\\seo-bot-493915-768db2aa70b0.json';
const sitemapPath = 'd:\\antigravity\\kpoker\\public\\sitemap.xml';

async function run() {
  if (!fs.existsSync(keyPath)) {
    console.error(`Error: Google Service Account Key file not found at ${keyPath}`);
    return;
  }

  if (!fs.existsSync(sitemapPath)) {
    console.error(`Error: Sitemap not found at ${sitemapPath}`);
    return;
  }

  // 1. Read sitemap.xml
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  
  // 2. Extract URLs
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(sitemapXml)) !== null) {
      urls.push(match[1]);
  }

  console.log(`📡 Found ${urls.length} URLs in sitemap to index.\n`);

  // 3. Authenticate with Google API
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  const client = await auth.getClient();
  const indexing = google.indexing({ version: 'v3', auth: client });

  // 4. Push URLs to Indexing API
  let successCount = 0;
  for (const url of urls) {
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED',
        },
      });
      console.log(`✅ Success: ${url} (Status: ${res.status})`);
      successCount++;
    } catch (e) {
      console.error(`❌ Failed: ${url} - ${e.message}`);
    }
    // Respect rate limits
    await new Promise(r => setTimeout(r, 600));
  }
  
  console.log(`\n🎉 Indexing push completed! Successfully requested ${successCount}/${urls.length} pages.`);
}

run().catch(console.error);
