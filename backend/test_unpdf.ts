// Test script to verify PDF extraction with unpdf
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testUnpdf() {
    console.log('=== Testing unpdf PDF extraction ===\n');

    // Check if there's a test.pdf in the backend folder
    const testPdfPath = path.resolve(__dirname, '../test.pdf');

    if (!fs.existsSync(testPdfPath)) {
        console.log('No test.pdf found at:', testPdfPath);
        console.log('Creating a simple test to check if unpdf module loads...\n');
    }

    try {
        // Test 1: Import unpdf
        console.log('Test 1: Importing unpdf...');
        const { extractText } = await import('unpdf');
        console.log('✓ unpdf imported successfully!\n');

        // Test 2: If test.pdf exists, try to extract text
        if (fs.existsSync(testPdfPath)) {
            console.log('Test 2: Extracting text from test.pdf...');
            const pdfBuffer = fs.readFileSync(testPdfPath);
            const { text, totalPages } = await extractText(pdfBuffer);
            console.log(`✓ Extracted ${text.length} characters from ${totalPages} pages`);
            console.log('\nFirst 500 characters:');
            console.log(text.substring(0, 500));
        } else {
            console.log('Test 2: Skipped (no test.pdf file)');
        }

        console.log('\n=== All tests passed! ===');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testUnpdf();
