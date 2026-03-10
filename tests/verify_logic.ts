import { EditParser } from '../src/utils/EditParser';
import { ContextGuard } from '../src/utils/ContextGuard';
import * as fs from 'fs';
import * as path from 'path';

async function runTests() {
    console.log("--- TEST: EditParser Resiliency ---");
    const testFile = path.join(process.cwd(), 'test_edit.txt');
    const originalContent = "line 1\nline 2\nline 3";
    fs.writeFileSync(testFile, originalContent);

    const edits = `test_edit.txt
\`\`\`
<<<<<<< SEARCH
line 2
=======
line 2 - modified
>>>>>>> REPLACE
\`\`\``;

    const blocks = EditParser.parseBlocks(edits);
    console.log("Parsed blocks:", blocks.length);

    const results = EditParser.applyBlocks(blocks);
    console.log("Apply results:", results);

    const newContent = fs.readFileSync(testFile, 'utf-8');
    if (newContent.includes("modified")) {
        console.log("SUCCESS: Edit applied correctly.");
    } else {
        console.log("FAILURE: Edit not applied.");
    }
    fs.unlinkSync(testFile);

    console.log("\n--- TEST: ContextGuard Truncation ---");
    const longText = "A".repeat(6000);
    const truncated = ContextGuard.truncate(longText, 100);
    console.log("Truncated length:", truncated.length);
    if (truncated.includes("TRUNCATED")) {
        console.log("SUCCESS: ContextGuard truncated correctly.");
    } else {
        console.log("FAILURE: ContextGuard did not truncate.");
    }
}

runTests();
