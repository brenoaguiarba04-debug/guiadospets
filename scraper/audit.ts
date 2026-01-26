import { chromium } from 'playwright';
import { processWithLocalLLM } from './ollama';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

console.log(`Debug Env: DB Connected to ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

async function runAudit() {
    console.log("🔍 Starting Database Audit (Direct Playwright)...");

    // 1. Fetch links
    const { data: links, error } = await supabase
        .from('precos')
        .select('id, link_afiliado, produto_id, loja')
        .not('link_afiliado', 'is', null);

    if (error || !links || links.length === 0) {
        console.error("❌ No links found or error:", error);
        return;
    }

    const scrapeLinks = links.filter(l =>
        l.link_afiliado &&
        !l.link_afiliado.includes('shopee') &&
        !l.link_afiliado.includes('shp.ee')
    );

    console.log(`📋 Found ${scrapeLinks.length} links to audit (excluding Shopee).`);

    // 2. Launch Browser (Session Persistent)
    const userDataDir = path.resolve(__dirname, 'browser_session');
    console.log(`Using session from: ${userDataDir}`);

    // Launch persistent context
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // Visible for session usage
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // 3. Process Links
    for (const link of scrapeLinks) {
        const url = link.link_afiliado!;
        const { produto_id, id: price_id } = link;
        console.log(`\nProcessing Product ${produto_id} | URL: ${url}`);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            // Basic wait for stability
            await page.waitForTimeout(2000);

            // Try to identify if loaded
            const title = await page.evaluate(() => document.title);
            console.log(`Page Title: ${title}`);

            const rawBody = await page.evaluate(() => document.body.innerText);

            // AI Processing
            console.log(`🧠 Sending to Llama...`);
            const products = await processWithLocalLLM(rawBody.slice(0, 6000));

            if (products && products.length > 0) {
                const mainMatch = products[0];
                if (mainMatch.nome) {
                    console.log(`✨ AI Identified: ${mainMatch.nome} (R$ ${mainMatch.preco})`);

                    // UPDATE Product
                    const { error: updateError } = await supabase
                        .from('produtos')
                        .update({
                            nome: mainMatch.nome,
                            marca: mainMatch.marca || undefined
                        })
                        .eq('id', produto_id);

                    if (!updateError) console.log(`✅ Updated Product Metadata`);

                    // UPDATE Price
                    if (mainMatch.preco > 0) {
                        await supabase
                            .from('precos')
                            .update({
                                preco: mainMatch.preco,
                                ultima_atualizacao: new Date().toISOString()
                            })
                            .eq('id', price_id);
                        console.log(`✅ Updated Price Entry`);
                    }
                }
            } else {
                console.log(`⚠️ AI could not match data.`);
            }

        } catch (e) {
            console.error(`❌ Error processing ${url}:`, e);
        }
    }

    await context.close();
    console.log("🎉 Audit Complete!");
}

runAudit().catch(console.error);
