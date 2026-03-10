import * as fs from 'fs';
import * as path from 'path';

export interface EditBlock {
    filePath: string;
    search: string;
    replace: string;
}

export class EditParser {
    static parseBlocks(content: string): EditBlock[] {
        const blocks: EditBlock[] = [];
        const lines = content.split('\n');

        let currentFile: string | null = null;
        let inBlock = false;
        let inSearch = false;
        let inReplace = false;
        let searchLines: string[] = [];
        let replaceLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (!inBlock && line.trim() && !line.startsWith('```') && !line.startsWith('<<<<<<<')) {
                if (lines[i + 1]?.trim().startsWith('```') || lines[i + 1]?.trim().startsWith('<<<<<<<')) {
                    currentFile = line.trim();
                }
            }

            if (line.trim().startsWith('<<<<<<< SEARCH')) {
                inBlock = true;
                inSearch = true;
                searchLines = [];
                continue;
            }

            if (line.trim().startsWith('=======')) {
                inSearch = false;
                inReplace = true;
                replaceLines = [];
                continue;
            }

            if (line.trim().startsWith('>>>>>>> REPLACE')) {
                inReplace = false;
                inBlock = false;

                if (currentFile) {
                    blocks.push({
                        filePath: currentFile,
                        search: searchLines.join('\n'),
                        replace: replaceLines.join('\n')
                    });
                }
                continue;
            }

            if (inSearch) {
                searchLines.push(line);
            } else if (inReplace) {
                replaceLines.push(line);
            }
        }

        return blocks;
    }

    static applyBlocks(blocks: EditBlock[]): { filePath: string; success: boolean; error?: string }[] {
        const results: { filePath: string; success: boolean; error?: string }[] = [];

        for (const block of blocks) {
            try {
                const fullPath = path.resolve(process.cwd(), block.filePath);
                if (!fs.existsSync(fullPath)) {
                    results.push({ filePath: block.filePath, success: false, error: 'File not found' });
                    continue;
                }

                const content = fs.readFileSync(fullPath, 'utf-8');
                const normalize = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trim();

                const normalizedContent = content.replace(/\r\n/g, '\n'); // Keep internal spacing, only normalize line endings
                const targetSearch = block.search.replace(/\r\n/g, '\n');
                const targetReplace = block.replace.replace(/\r\n/g, '\n');

                if (targetSearch.trim() === "") {
                    // Prepend if search block is essentially empty (creation/append)
                    const newContent = targetReplace + (content ? '\n' + content : '');
                    fs.writeFileSync(fullPath, newContent);
                    results.push({ filePath: block.filePath, success: true });
                } else if (content.includes(targetSearch)) {
                    const newContent = content.replace(targetSearch, targetReplace);
                    fs.writeFileSync(fullPath, newContent);
                    results.push({ filePath: block.filePath, success: true });
                } else {
                    // Try one more time with whitespace normalization if exact match fails
                    const normContent = normalize(content);
                    const normSearch = normalize(targetSearch);
                    const normReplace = normalize(targetReplace);

                    if (normContent.includes(normSearch)) {
                        // This is tricky: replacing normalized content lose original indentation
                        // But for now, we'll favor the fix. 
                        const updated = normContent.replace(normSearch, normReplace);
                        fs.writeFileSync(fullPath, updated);
                        results.push({ filePath: block.filePath, success: true });
                    } else {
                        results.push({
                            filePath: block.filePath,
                            success: false,
                            error: 'SEARCH block match failed. Verification: Block was not found in file.'
                        });
                    }
                }
            } catch (err: any) {
                results.push({ filePath: block.filePath, success: false, error: err.message });
            }
        }

        return results;
    }
}
