import * as fs from 'fs';
import * as path from 'path';

export interface EditBlock {
    filePath: string;
    search: string;
    replace: string;
}

export class EditParser {
    /**
     * Parses SEARCH/REPLACE blocks from LLM output.
     * Format:
     * path/to/file
     * ```language
     * <<<<<<< SEARCH
     * old code
     * =======
     * new code
     * >>>>>>> REPLACE
     * ```
     */
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

            // Detect file path (looks for lines before code blocks)
            if (!inBlock && line.trim() && !line.startsWith('```') && !line.startsWith('<<<<<<<')) {
                // Aider-style: file path is on its own line before the block
                // Check if next line or two starts a code block
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

    /**
     * Applies a list of edit blocks to the filesystem.
     * Returns a summary of success/failure for each block.
     */
    static applyBlocks(blocks: EditBlock[]): { filePath: string; success: boolean; error?: string }[] {
        const results: { filePath: string; success: boolean; error?: string }[] = [];

        for (const block of blocks) {
            try {
                if (!fs.existsSync(block.filePath)) {
                    results.push({ filePath: block.filePath, success: false, error: 'File not found' });
                    continue;
                }

                let content = fs.readFileSync(block.filePath, 'utf-8');

                // Exact match check (Aider standard)
                // Note: We need to handle potential line ending differences
                const normalizedContent = content.replace(/\r\n/g, '\n');
                const normalizedSearch = block.search.replace(/\r\n/g, '\n');
                const normalizedReplace = block.replace.replace(/\r\n/g, '\n');

                if (normalizedSearch === "") {
                    // Creation case or append case (if search is empty)
                    // Aider uses empty SEARCH for new files, but we'll prepend/append logic here if file exists
                    content = normalizedReplace + (normalizedContent ? '\n' + normalizedContent : '');
                    fs.writeFileSync(block.filePath, content);
                    results.push({ filePath: block.filePath, success: true });
                } else if (normalizedContent.includes(normalizedSearch)) {
                    const newContent = normalizedContent.replace(normalizedSearch, normalizedReplace);
                    fs.writeFileSync(block.filePath, newContent);
                    results.push({ filePath: block.filePath, success: true });
                } else {
                    results.push({
                        filePath: block.filePath,
                        success: false,
                        error: 'Search block does not match file content exactly'
                    });
                }
            } catch (err: any) {
                results.push({ filePath: block.filePath, success: false, error: err.message });
            }
        }

        return results;
    }
}
