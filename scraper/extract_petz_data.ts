
import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve(__dirname, '../debug_petz_fast_source.html');

try {
    const content = fs.readFileSync(htmlPath, 'utf8');
    console.log(`Read ${content.length} bytes from ${htmlPath}`);

    // Look for analytics.track calls
    const regex = /analytics\.track\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\{[\s\S]*?\})\s*\)/g;
    let match;
    let found = false;

    while ((match = regex.exec(content)) !== null) {
        const eventName = match[1];
        const jsonStr = match[2];

        console.log(`\nFound Event: ${eventName}`);

        try {
            // Evaluated JSON (might contain JS keys without quotes, but usually analytics is clean JSON-like)
            // But often it's JS Object: { productId: '...' }
            // We can try Function return or simplified parsing.
            // Let's print a snippet first.
            console.log(`JSON Snippet: ${jsonStr.slice(0, 100)}...`);

            // naive approach: replace ' with " and add quotes to keys if missing?
            // Better: use Function construction if safe-ish (it's my own scrape)
            // Or just use a loose JSON parser if available.
            // For now, let's just log it.

            if (jsonStr.includes("Golden")) {
                console.log("!!! CONTAINS TARGET PRODUCT !!!");
                console.log(jsonStr);
            }

        } catch (e) {
            console.error("Error parsing JSON blob", e);
        }
    }

} catch (e) {
    console.error("Error matching:", e);
}
