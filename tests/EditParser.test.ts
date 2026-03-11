import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EditParser } from '../src/utils/EditParser';

describe('EditParser', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'selfer-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // ── parseBlocks ──────────────────────────────────────────────────────────

    describe('parseBlocks', () => {
        it('parses a single SEARCH/REPLACE block', () => {
            const input = `src/foo.ts
<<<<<<< SEARCH
const x = 1;
=======
const x = 2;
>>>>>>> REPLACE`;
            const blocks = EditParser.parseBlocks(input);
            expect(blocks).toHaveLength(1);
            expect(blocks[0].filePath).toBe('src/foo.ts');
            expect(blocks[0].search).toBe('const x = 1;');
            expect(blocks[0].replace).toBe('const x = 2;');
        });

        it('parses multiple blocks', () => {
            const input = `src/a.ts
<<<<<<< SEARCH
line a
=======
line A
>>>>>>> REPLACE

src/b.ts
<<<<<<< SEARCH
line b
=======
line B
>>>>>>> REPLACE`;
            const blocks = EditParser.parseBlocks(input);
            expect(blocks).toHaveLength(2);
            expect(blocks[0].filePath).toBe('src/a.ts');
            expect(blocks[1].filePath).toBe('src/b.ts');
        });

        it('returns empty array when no blocks found', () => {
            expect(EditParser.parseBlocks('no blocks here')).toHaveLength(0);
        });

        it('handles multi-line search and replace blocks', () => {
            const input = `file.ts
<<<<<<< SEARCH
function foo() {
  return 1;
}
=======
function foo() {
  return 42;
}
>>>>>>> REPLACE`;
            const blocks = EditParser.parseBlocks(input);
            expect(blocks).toHaveLength(1);
            expect(blocks[0].search).toContain('return 1;');
            expect(blocks[0].replace).toContain('return 42;');
        });
    });

    // ── applyBlocks ──────────────────────────────────────────────────────────

    describe('applyBlocks', () => {
        it('applies an exact match replacement', () => {
            const file = path.join(tmpDir, 'exact.ts');
            fs.writeFileSync(file, 'const x = 1;\nconst y = 2;\n');

            const results = EditParser.applyBlocks([{
                filePath: file,
                search: 'const x = 1;',
                replace: 'const x = 99;'
            }]);

            expect(results[0].success).toBe(true);
            expect(fs.readFileSync(file, 'utf-8')).toContain('const x = 99;');
        });

        it('fails gracefully when file does not exist', () => {
            const results = EditParser.applyBlocks([{
                filePath: path.join(tmpDir, 'nonexistent.ts'),
                search: 'foo',
                replace: 'bar'
            }]);
            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain('not found');
        });

        it('fails when SEARCH block does not match', () => {
            const file = path.join(tmpDir, 'mismatch.ts');
            fs.writeFileSync(file, 'const a = 1;\n');

            const results = EditParser.applyBlocks([{
                filePath: file,
                search: 'const z = 999;', // not in file
                replace: 'const z = 0;'
            }]);

            expect(results[0].success).toBe(false);
        });

        it('prepends content when search block is empty', () => {
            const file = path.join(tmpDir, 'prepend.ts');
            fs.writeFileSync(file, 'existing content\n');

            const results = EditParser.applyBlocks([{
                filePath: file,
                search: '',
                replace: '// header\n'
            }]);

            expect(results[0].success).toBe(true);
            const content = fs.readFileSync(file, 'utf-8');
            expect(content.startsWith('// header')).toBe(true);
        });

        it('applies fuzzy match when whitespace differs', () => {
            const file = path.join(tmpDir, 'fuzzy.ts');
            fs.writeFileSync(file, '  const x = 1;\n  const y = 2;\n');

            // Search without leading spaces
            const results = EditParser.applyBlocks([{
                filePath: file,
                search: 'const x = 1;',
                replace: 'const x = 99;'
            }]);

            expect(results[0].success).toBe(true);
            expect(fs.readFileSync(file, 'utf-8')).toContain('const x = 99;');
        });
    });
});
