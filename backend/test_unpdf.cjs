// Test unpdf with correct API
const path = require('path');
const fs = require('fs');

async function testUnpdf() {
    console.log('=== Testing unpdf PDF extraction ===\n');

    try {
        const { extractText, getDocumentProxy } = await import('unpdf');
        console.log('✓ unpdf imported successfully!');

        const testPdfPath = path.resolve(__dirname, 'test.pdf');
        console.log('Looking for:', testPdfPath);

        if (!fs.existsSync(testPdfPath)) {
            console.log('❌ No test.pdf found.');
            process.exit(1);
        }

        console.log('Reading PDF file...');
        const pdfBuffer = fs.readFileSync(testPdfPath);
        console.log('PDF size:', pdfBuffer.length, 'bytes');

        // Convert to Uint8Array
        const uint8Array = new Uint8Array(pdfBuffer);

        // Step 1: Get document proxy
        console.log('\nStep 1: Getting document proxy...');
        const pdf = await getDocumentProxy(uint8Array);
        console.log('✓ Document proxy obtained');

        // Step 2: Extract text
        console.log('Step 2: Extracting text...');
        const { totalPages, text } = await extractText(pdf, { mergePages: true });

        console.log(`\n✓ SUCCESS! Extracted ${text.length} characters from ${totalPages} pages`);
        console.log('\n--- First 500 characters ---');
        console.log(text.substring(0, 500));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testUnpdf();
