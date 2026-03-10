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
                const contentLines = content.split(/\r?\n/);
                const searchLines = block.search.split(/\r?\n/);
                const replaceLines = block.replace.split(/\r?\n/);

                if (block.search.trim() === "") {
                    // Prepend if search block is essentially empty (creation/append)
                    const newContent = replaceLines.join('\n') + (content ? '\n' + content : '');
                    fs.writeFileSync(fullPath, newContent);
                    results.push({ filePath: block.filePath, success: true });
                    continue;
                }

                // 1. Try Exact Match First
                const exactSearchStr = searchLines.join('\n');
                const exactReplaceStr = replaceLines.join('\n');
                const exactContentStr = contentLines.join('\n');

                if (exactContentStr.includes(exactSearchStr)) {
                    const newContent = exactContentStr.replace(exactSearchStr, exactReplaceStr);
                    fs.writeFileSync(fullPath, newContent);
                    results.push({ filePath: block.filePath, success: true });
                    continue;
                }

                // 2. Fuzzy Match (Ignore leading/trailing whitespace)
                let matchStartIndex = -1;
                let matchEndIndex = -1;
                
                // Helper to trim and normalize whitespace for comparison
                const normalize = (line: string) => line.trim().replace(/\s+/g, ' ');

                // Filter out empty lines from search block for more robust matching
                const nonHollowSearchLines = searchLines.map((l, idx) => ({ line: l, idx })).filter(x => x.line.trim() !== "");

                if (nonHollowSearchLines.length === 0) {
                     results.push({ filePath: block.filePath, success: false, error: 'Search block is entirely whitespace.' });
                     continue;
                }

                const firstSearchLineNormalized = normalize(nonHollowSearchLines[0].line);
                
                for (let i = 0; i <= contentLines.length - nonHollowSearchLines.length; i++) {
                    if (normalize(contentLines[i]) === firstSearchLineNormalized) {
                        let isMatch = true;
                        let contentIdx = i + 1;
                        let searchIdx = 1;

                        while (searchIdx < nonHollowSearchLines.length && contentIdx < contentLines.length) {
                             // Skip empty lines in content during fuzzy matching
                             if (contentLines[contentIdx].trim() === "") {
                                 contentIdx++;
                                 continue;
                             }
                             if (normalize(contentLines[contentIdx]) !== normalize(nonHollowSearchLines[searchIdx].line)) {
                                 isMatch = false;
                                 break;
                             }
                             contentIdx++;
                             searchIdx++;
                        }

                        if (isMatch && searchIdx === nonHollowSearchLines.length) {
                            matchStartIndex = i;
                            matchEndIndex = contentIdx - 1;
                            break;
                        }
                    }
                }

                if (matchStartIndex !== -1 && matchEndIndex !== -1) {
                    // We found a fuzzy match. 
                    // Calculate indentation difference based on the first matched line.
                    const originalIndent = contentLines[matchStartIndex].match(/^\s*/)?.[0] || '';
                    const searchIndent = nonHollowSearchLines[0].line.match(/^\s*/)?.[0] || '';
                    
                    // Apply the replacement lines, adjusting their indentation
                    const adjustedReplaceLines = replaceLines.map(line => {
                         if (!line.trim()) return line; // Leave empty lines alone
                         if (line.startsWith(searchIndent)) {
                             return originalIndent + line.substring(searchIndent.length);
                         }
                         return line; // If it doesn't share the search indent, leave it (rare)
                    });

                    contentLines.splice(matchStartIndex, (matchEndIndex - matchStartIndex) + 1, ...adjustedReplaceLines);
                    fs.writeFileSync(fullPath, contentLines.join('\n'));
                    results.push({ filePath: block.filePath, success: true });
                } else {
                    results.push({
                        filePath: block.filePath,
                        success: false,
                        error: 'SEARCH block match failed. Verification: Block was not found in file (even with fuzzy matching).'
                    });
                }

            } catch (err: any) {
                results.push({ filePath: block.filePath, success: false, error: err.message });
            }
        }

        return results;
    }
}
