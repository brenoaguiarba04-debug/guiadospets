
import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve(__dirname, '../debug_petz_fast_source.html');

try {
    const content = fs.readFileSync(htmlPath, 'utf8');

    console.log("Searching for product data in " + htmlPath);

    // Regex to find "items": [ ... ] or "products": [ ... ]
    // We capture the content inside the brackets.
    // The key might be quoted or unquoted.
    const regex = /(?:["']?items["']?|["']?products["']?)\s*:\s*\[(.*?)\]/gs;

    let match;
    let found = false;

    while ((match = regex.exec(content)) !== null) {
        let listContent = match[1];

        // Sanity check: is it a valid list of objects?
        // It might be truncated if the regex is too greedy, but let's check size
        if (listContent.length > 10) {
            console.log("\n--- Potential Product List Detected ---");
            console.log("Snippet: " + listContent.slice(0, 200).replace(/\n/g, ' '));

            // Check for keywords
            if (listContent.includes("Golden") || listContent.includes("name") || listContent.includes("id")) {
                console.log("✅ Contains expected keywords!");
                found = true;
            } else {
                console.log("⚠️ detected list but no product keywords.");
            }
        }
    }

    if (!found) {
        console.log("No obvious product lists found via regex.");
        // Fallback: Dump specific area if known
        const idx = content.indexOf("Golden");
        if (idx !== -1) {
            console.log("\nContext around 'Golden' keyword:");
            console.log(content.substring(idx - 200, idx + 200).replace(/\n/g, ' '));
        }
    }

} catch (e) {
    console.error("Error", e);
}
