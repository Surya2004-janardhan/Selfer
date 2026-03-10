import * as fs from 'fs';
import * as path from 'path';

export class RepoMap {
    static getMap(depth: number = 2): string {
        const root = process.cwd();
        let result = "--- Repository Map (Skeleton) ---\n";

        const walk = (dir: string, currentDepth: number) => {
            if (currentDepth > depth) return;
            if (!fs.existsSync(dir)) return;

            const files = fs.readdirSync(dir);

            files.forEach(file => {
                const fullPath = path.join(dir, file);
                const relPath = path.relative(root, fullPath);

                // Ignore common noisy directories
                if (relPath.includes('node_modules') ||
                    relPath.includes('.git') ||
                    relPath.includes('dist') ||
                    relPath.includes('.selfer') ||
                    relPath.includes('aider')) return;

                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    result += `\n[DIR] ${relPath}/\n`;
                    walk(fullPath, currentDepth + 1);
                } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.md')) {
                    result += `  [FILE] ${relPath}\n`;
                    if (file.endsWith('.ts') || file.endsWith('.js')) {
                        const sigs = this.extractSignatures(fullPath);
                        if (sigs) result += sigs.split('\n').map(s => `    ${s}`).join('\n') + '\n';
                    }
                }
            });
        };

        walk(root, 1);
        return result;
    }

    static getTree(): string {
        const root = process.cwd();
        let result = "--- File Tree ---\n";

        const walk = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                const fullPath = path.join(dir, file);
                const relPath = path.relative(root, fullPath);

                if (relPath.includes('node_modules') ||
                    relPath.includes('.git') ||
                    relPath.includes('dist') ||
                    relPath.includes('.selfer')) return;

                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    result += `${relPath}/\n`;
                    walk(fullPath);
                } else {
                    result += `  ${relPath}\n`;
                }
            });
        };

        walk(root);
        return result;
    }

    static getFileSignatures(filePath: string): string {
        const fullPath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) return "";
        const sigs = this.extractSignatures(fullPath);
        return sigs ? `[SIGNATURES for ${filePath}]:\n${sigs}\n` : "";
    }

    private static extractSignatures(filePath: string): string {
        // ... (existing implementation)
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const signatures: string[] = [];

            const patterns = [
                /^\s*(export\s+)?class\s+(\w+)/,
                /^\s*(export\s+)?(async\s+)?function\s+(\w+)/,
                /^\s*(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\s*\(/,
                /^\s*(public|private|protected|static|async)\s+(\w+)\s*\(.*\)\s*[:{]/
            ];

            lines.forEach((line, index) => {
                if (patterns.some(p => p.test(line)) && line.length < 200) {
                    signatures.push(`${index + 1}: ${line.trim().replace(/{.*$/, '').trim()}`);
                }
            });

            return signatures.slice(0, 15).join('\n'); // Limit to 15 signatures per file for brevity
        } catch (e) {
            return "";
        }
    }
}
