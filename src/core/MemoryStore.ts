import * as fs from 'fs';
import * as path from 'path';

export class MemoryStore {
    private memoryPath: string;

    constructor(private directory: string) {
        this.memoryPath = path.join(directory, '.selfer', 'memory.json');
    }

    async saveSession(sessionData: any) {
        const memory = this.loadMemory();
        memory.sessions.push({
            timestamp: new Date().toISOString(),
            ...sessionData
        });
        fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2));
    }

    async createSnapshot(snapshotName: string, data: any) {
        const snapshotPath = path.join(this.directory, '.selfer', 'snapshots');
        if (!fs.existsSync(snapshotPath)) {
            fs.mkdirSync(snapshotPath, { recursive: true });
        }
        fs.writeFileSync(path.join(snapshotPath, `${snapshotName}.json`), JSON.stringify(data, null, 2));
    }

    private loadMemory() {
        if (fs.existsSync(this.memoryPath)) {
            return JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        }
        return { sessions: [] };
    }
}
