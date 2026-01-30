import { selectBestMatch, ProductCandidate } from '../scraper/ollama';
import chalk from 'chalk';

async function runTest() {
    console.log(chalk.blue('🧪 Starting Groq API Product Match Test...\n'));

    // Test Case 1: Weight Mismatch
    console.log(chalk.yellow('Test 1: Weight Specificity (15kg vs 3kg)'));
    const candidates1: ProductCandidate[] = [
        { index: 0, title: 'Ração Golden Formula Adulto 3kg', price: 45.90, link: '' },
        { index: 1, title: 'Ração Golden Formula Adulto 15kg', price: 149.90, link: '' }, // Correct
        { index: 2, title: 'Ração Golden Formula Filhote 15kg', price: 155.90, link: '' } // Wrong type
    ];
    const query1 = 'Ração Golden Formula Cães Adultos Frango e Arroz 15kg';
    const result1 = await selectBestMatch(candidates1, query1);
    console.log(`Expected: 1, Got: ${result1} - ${result1 === 1 ? chalk.green('PASS') : chalk.red('FAIL')}\n`);

    // Test Case 2: Variant Match (Bravecto)
    console.log(chalk.yellow('Test 2: Variant Match (Bravecto 10-20kg)'));
    const candidates2: ProductCandidate[] = [
        { index: 0, title: 'Antipulgas Bravecto para Cães 4.5 a 10kg', price: 180.00, link: '' },
        { index: 1, title: 'Antipulgas Bravecto para Cães 20 a 40kg', price: 230.00, link: '' },
        { index: 2, title: 'Antipulgas Bravecto para Cães 10 a 20kg', price: 210.00, link: '' } // Correct
    ];
    const query2 = 'Bravecto 10 a 20 kg';
    const result2 = await selectBestMatch(candidates2, query2);
    console.log(`Expected: 2, Got: ${result2} - ${result2 === 2 ? chalk.green('PASS') : chalk.red('FAIL')}\n`);

    // Test Case 3: No valid match
    console.log(chalk.yellow('Test 3: No valid match'));
    const candidates3: ProductCandidate[] = [
        { index: 0, title: 'Shampoo Sanol Dog 500ml', price: 15.00, link: '' },
        { index: 1, title: 'Tapete Higiênico Super Secão', price: 25.00, link: '' }
    ];
    const query3 = 'Ração Royal Canin';
    const result3 = await selectBestMatch(candidates3, query3);
    console.log(`Expected: -1, Got: ${result3} - ${result3 === -1 ? chalk.green('PASS') : chalk.red('FAIL')}\n`);

    // Test Case 4: Tricky Medicine Weight (Simparic 20.1 to 40kg)
    console.log(chalk.yellow('Test 4: Medicine Weight Range (Simparic 40kg exact)'));
    const candidates4: ProductCandidate[] = [
        { index: 0, title: 'Simparic 10.1 a 20kg', price: 120.00, link: '' },
        { index: 1, title: 'Simparic 20.1 a 40kg', price: 150.00, link: '' }, // Correct
        { index: 2, title: 'Simparic 40.1 a 60kg', price: 180.00, link: '' }
    ];
    const query4 = 'Simparic para cães de 40 kg'; // People often search for the max weight
    const result4 = await selectBestMatch(candidates4, query4);
    console.log(`Expected: 1, Got: ${result4} - ${result4 === 1 ? chalk.green('PASS') : chalk.red('FAIL')}\n`);
}

runTest();
