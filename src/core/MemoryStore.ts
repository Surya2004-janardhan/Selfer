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

    async updateContext(provider: any) {
        const memory = this.loadMemory();
        if (memory.sessions.length < 5) return; // Not enough history to consolidate

        const consolidatedContext = memory.context || "";
        const newSessions = memory.sessions.map((s: any) => `User: ${s.query}\nSelfer: ${s.response}`).join('\n\n');

        const prompt = `You are Selfer's Memory Consolidation Agent. 
    Review the previous context and the new recent interactions below.
    Synthesize them into a concise, intelligent high-level summary of what you've learned about the user's project, preferences, and current progress.
    Keep the summary smart and informative, around 10 lines max.
    
    Current Context: ${consolidatedContext}
    Recent Interactions: ${newSessions}`;

        const response = await provider.generateResponse([{ role: 'system', content: prompt }]);

        memory.context = response.content;
        memory.sessions = []; // Clear short-term history after consolidation
        fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2));
        return memory.context;
    }

    getContext(): string {
        const memory = this.loadMemory();
        return memory.context || "No existing context.";
    }

    private loadMemory() {
        if (fs.existsSync(this.memoryPath)) {
            return JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
        }
        return { sessions: [], context: "" };
    }
}
