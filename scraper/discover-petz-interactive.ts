import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chalk from 'chalk'; // npm install chalk
import Table from 'cli-table3'; // npm install cli-table3
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

interface DiscoveredAPI {
    url: string;
    method: string;
    statusCode: number;
    responseType: string;
    hasProducts: boolean;
    sampleData: string;
    timestamp: string;
}

// ========== FERRAMENTA DE DESCOBERTA DE API ==========
export class APIDiscoveryTool {
    private discoveredAPIs: DiscoveredAPI[] = [];
    private storeName: string;

    constructor(storeName: string) {
        this.storeName = storeName;
    }

    /**
     * Descobre APIs de uma loja de forma interativa
     */
    async discover(url: string, searchTerm?: string): Promise<DiscoveredAPI[]> {
        console.log(chalk.bold.cyan(`\n${'='.repeat(70)}`));
        console.log(chalk.bold.cyan(`🔍 API DISCOVERY TOOL - ${this.storeName.toUpperCase()}`));
        console.log(chalk.bold.cyan(`${'='.repeat(70)}\n`));

        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1920, height: 1080 }
        });

        const page = await browser.newPage();

        // Interceptar todas as requests
        await page.setRequestInterception(true);

        const processedUrls = new Set<string>();

        page.on('request', (request: any) => {
            request.continue();
        });

        page.on('response', async (response: any) => {
            const url = response.url();
            const method = response.request().method();
            const statusCode = response.status();

            // Evitar duplicatas
            if (processedUrls.has(url)) return;
            processedUrls.add(url);

            const contentType = response.headers()['content-type'] || '';

            // Filtrar apenas JSON
            if (!contentType.includes('application/json')) return;

            try {
                const data = await response.json();

                // Detectar se é API de produtos
                const hasProducts = this.detectProductAPI(data, url);

                if (hasProducts || url.includes('/search') || url.includes('/product')) {
                    const discovered: DiscoveredAPI = {
                        url,
                        method,
                        statusCode,
                        responseType: contentType,
                        hasProducts,
                        sampleData: JSON.stringify(data).substring(0, 300),
                        timestamp: new Date().toISOString()
                    };

                    this.discoveredAPIs.push(discovered);
                    this.printDiscoveredAPI(discovered);
                }
            } catch (e) {
                // Não é JSON válido ou erro ao parsear
            }
        });

        // Navegar
        console.log(chalk.yellow(`📄 Loading: ${url}\n`));
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        // Se forneceu termo de busca, fazer a busca
        if (searchTerm) {
            console.log(chalk.yellow(`🔎 Searching for: ${searchTerm}\n`));

            try {
                // Tentar encontrar campo de busca
                const searchSelectors = [
                    'input[type="search"]',
                    'input[placeholder*="busca" i]',
                    'input[placeholder*="search" i]',
                    'input[name="q"]',
                    'input[name="search"]',
                    '.search-input',
                    '#search',
                    '#search_input'
                ];

                let searchInput = null;
                for (const selector of searchSelectors) {
                    try {
                        searchInput = await page.$(selector);
                        if (searchInput) {
                            console.log(chalk.green(`✅ Found search input: ${selector}`));
                            break;
                        }
                    } catch (e) { }
                }

                if (searchInput) {
                    await searchInput.type(searchTerm, { delay: 100 });
                    await page.keyboard.press('Enter');

                    // Aguardar carregar resultados
                    console.log(chalk.yellow('⏳ Waiting for search results...\n'));
                    await new Promise(r => setTimeout(r, 8000));
                } else {
                    console.log(chalk.red('❌ Could not find search input. Navigating directly...'));
                    const searchUrl = `${url}/busca?q=${encodeURIComponent(searchTerm)}`;
                    await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
                    await new Promise(r => setTimeout(r, 5000));
                }
            } catch (error) {
                console.log(chalk.red(`❌ Error during search: ${error}`));
            }
        }

        // Aguardar mais requests
        await page.waitForTimeout(3000);

        await browser.close();

        // Gerar relatório
        this.generateReport();

        return this.discoveredAPIs;
    }

    /**
     * Detecta se uma resposta JSON contém produtos
     */
    private detectProductAPI(data: any, url: string): boolean {
        // Checagens por estrutura
        if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            if (this.looksLikeProduct(first)) return true;
        }

        if (data?.products && Array.isArray(data.products)) return true;
        if (data?.items && Array.isArray(data.items)) return true;
        if (data?.results && Array.isArray(data.results)) return true;
        if (data?.data?.products) return true;

        // Checagens por URL
        const urlLower = url.toLowerCase();
        if ((urlLower.includes('/search') && (urlLower.includes('?q=') || urlLower.includes('query='))) ||
            urlLower.includes('catalog_system') ||
            urlLower.includes('sku')
        ) return true;

        return false;
    }

    /**
     * Verifica se um objeto parece ser um produto
     */
    private looksLikeProduct(obj: any): boolean {
        if (!obj || typeof obj !== 'object') return false;

        const productKeys = ['name', 'price', 'sku', 'id', 'title', 'productName', 'productId'];
        const matches = productKeys.filter(key => key in obj);

        return matches.length >= 2;
    }

    /**
     * Imprime uma API descoberta com formatação
     */
    private printDiscoveredAPI(api: DiscoveredAPI): void {
        const icon = api.hasProducts ? '🎯' : '📦';
        const label = api.hasProducts ?
            chalk.bold.green('*** PRODUCT API FOUND ***') :
            chalk.bold.yellow('API Found');

        console.log(chalk.bold(`${icon} ${label}`));
        console.log(chalk.gray(`   URL: ${chalk.white(api.url)}`));
        console.log(chalk.gray(`   Method: ${chalk.cyan(api.method)} | Status: ${chalk.green(api.statusCode)}`));
        console.log(chalk.gray(`   Data Preview: ${api.sampleData.substring(0, 150)}...`));
        console.log('');
    }

    /**
     * Gera relatório final em tabela
     */
    private generateReport(): void {
        console.log(chalk.bold.cyan(`\n${'='.repeat(70)}`));
        console.log(chalk.bold.cyan(`📊 DISCOVERY REPORT - ${this.storeName.toUpperCase()}`));
        console.log(chalk.bold.cyan(`${'='.repeat(70)}\n`));

        const productAPIs = this.discoveredAPIs.filter(a => a.hasProducts);
        const otherAPIs = this.discoveredAPIs.filter(a => !a.hasProducts);

        console.log(chalk.bold.green(`✅ Product APIs Found: ${productAPIs.length}`));
        console.log(chalk.bold.yellow(`📦 Other APIs Found: ${otherAPIs.length}`));
        console.log('');

        if (productAPIs.length > 0) {
            const table = new Table({
                head: [
                    chalk.cyan('Method'),
                    chalk.cyan('URL'),
                    chalk.cyan('Status')
                ],
                colWidths: [10, 70, 10]
            });

            productAPIs.forEach(api => {
                table.push([
                    api.method,
                    api.url.substring(0, 65) + '...',
                    api.statusCode.toString()
                ]);
            });

            console.log(table.toString());
        }

        // Salvar em arquivo JSON
        const outputPath = path.join(__dirname, `api-discovery-${this.storeName}-${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(this.discoveredAPIs, null, 2));

        console.log(chalk.green(`\n💾 Full report saved to: ${outputPath}`));

        // Gerar código de exemplo
        if (productAPIs.length > 0) {
            console.log(chalk.bold.cyan('\n📝 SAMPLE CODE:\n'));
            this.generateSampleCode(productAPIs[0]);
        }
    }

    /**
     * Gera código TypeScript de exemplo
     */
    private generateSampleCode(api: DiscoveredAPI): void {
        const code = `
// Add this to your API_CONFIGS:

${this.storeName}: {
    searchEndpoint: '${api.url.split('?')[0]}',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.${this.storeName}.com.br/'
    },
    buildUrl: (searchTerm: string) => {
        // Adjust parameters based on the URL pattern
        return \`${api.url.replace(/q=[^&]+/, 'q=${encodeURIComponent(searchTerm)}')}\`;
    },
    parseProduct: (item: any): APIProduct => ({
        id: item.id || item.productId || item.sku,
        name: item.name || item.productName || item.title,
        price: item.price || item.bestPrice || 0,
        url: item.url || item.link,
        image: item.image || item.imageUrl || '',
        variants: item.variants || []
    })
}`;

        console.log(chalk.gray(code));
    }
}

// ========== EXEMPLO DE USO ==========
async function example() {
    // Descobrir API da Petz
    const petzDiscovery = new APIDiscoveryTool('petz');
    await petzDiscovery.discover(
        'https://www.petz.com.br',
        'ração golden'
    );
}

// Rodar agora
example();

export default APIDiscoveryTool;
