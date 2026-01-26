
import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve(__dirname, '../debug_petz_fast_source.html');

try {
    const content = fs.readFileSync(htmlPath, 'utf8');

    // Find Golden
    const indices = [];
    let pos = content.indexOf('Golden');
    while (pos !== -1) {
        indices.push(pos);
        pos = content.indexOf('Golden', pos + 1);
    }

    console.log(`Found 'Golden' at indices: ${indices.join(', ')}`);

    for (const idx of indices) {
        console.log(`\n--- Match at ${idx} ---`);
        const start = Math.max(0, idx - 1000);
        const end = Math.min(content.length, idx + 1000);
        const snippet = content.substring(start, end);

        // Sanitize newlines for logging
        console.log(snippet.replace(/\n/g, ' '));

        // Try to find looking back for 'analytics.track'
        const fullPre = content.substring(0, idx);
        const lastTrack = fullPre.lastIndexOf('analytics.track');
        if (lastTrack !== -1 && (idx - lastTrack < 2000)) {
            console.log(`\nPossible Container (starts at ${lastTrack}):`);
            console.log(content.substring(lastTrack, lastTrack + 500).replace(/\n/g, ' '));
        }
    }

} catch (e) {
    console.error("Error", e);
}
