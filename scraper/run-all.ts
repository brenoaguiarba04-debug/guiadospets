
import { spawn } from 'child_process';
import chalk from 'chalk';

function runScript(command: string, args: string[], name: string, color: any) {
    console.log(color(`🚀 Iniciando ${name}...`));

    const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true
    });

    child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
            if (line.trim()) console.log(color(`[${name}] ${line.trim()}`));
        });
    });

    child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
            if (line.trim()) console.error(color(`[${name} ERROR] ${line.trim()}`));
        });
    });

    child.on('close', (code) => {
        console.log(color(`🏁 ${name} finalizado com código ${code}`));
    });

    return child;
}

const limitArg = process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit') + 1] : '20';
const isAll = limitArg.toLowerCase() === 'all';
const limit = isAll ? 'todos' : limitArg;

console.log(chalk.bold.white(`⚡ Rodando TODOS os scrapers simultaneamente (Limit: ${limit})...`));

const commonArgs = isAll ? [] : ['--limit', limitArg];

// Inicia os processos em paralelo
// ML
runScript('npm', ['run', 'scrape:ml', '--', ...commonArgs], 'ML', chalk.yellow);

// Shopee
runScript('npm', ['run', 'scrape:shopee', '--', ...commonArgs], 'SHOPEE', chalk.rgb(255, 100, 0));

// Amazon (Batch)
runScript('npx', ['tsx', 'scraper/amazon_scraper.ts', '--batch', ...commonArgs], 'AMAZON', chalk.cyan);

