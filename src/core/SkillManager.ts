import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class SkillManager {
    private static SKILLS_DIR = 'skills';

    private static DEFAULT_SKILLS = [
        {
            name: 'master.md',
            content: '# Master Orchestration\n\n## Strategic Oversight\n- **Context Preservation**: Always maintain the "Why" behind a user\'s request.\n- **Agent Orchestration**: Delegate to the most efficient agent for the specific sub-task.\n- **Decision Logic**: Iterative refinement and strict ROI on task priority.'
        },
        {
            name: 'git.md',
            content: '# Git & Version Control Mastery\n\n## Core Principles\n- **Atomic Commits**: Single, logical changes.\n- **Branching**: Conventional branching (main, develop, feature/*).\n- **Conflicts**: Rebase-first approach for clean linear history.'
        },
        {
            name: 'backend.md',
            content: '# Backend Architecture & Systems\n\n## Design\n- **Clean Architecture**: Separation of concerns.\n- **API Engineering**: RESTful maturity and schema-first design.\n- **Security**: JWT, Encryption, and OWASP mitigation.'
        },
        {
            name: 'frontend.md',
            content: '# Frontend Excellence & UX\n\n## Stack\n- **Performance**: SSR/SSG, Core Web Vitals, and asset optimization.\n- **UI/UX**: Premium aesthetics (Glassmorphism, High-end HSL transitions).\n- **Accessibility**: WCAG compliance and semantic HTML.'
        }
    ];

    static init() {
        if (!fs.existsSync(this.SKILLS_DIR)) {
            fs.mkdirSync(this.SKILLS_DIR);
        }

        this.DEFAULT_SKILLS.forEach(skill => {
            const filePath = path.join(this.SKILLS_DIR, skill.name);
            // Only write if empty or doesn't exist to avoid overwriting user customizations
            if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim().length < 50) {
                fs.writeFileSync(filePath, skill.content);
            }
        });
    }

    static getSkillsList(): string {
        const files = fs.readdirSync(this.SKILLS_DIR).filter(f => f.endsWith('.md'));
        if (files.length === 0) return "No skills found.";

        let output = chalk.blue.bold('\n--- Available Skills ---\n');
        files.forEach(file => {
            const name = path.basename(file, '.md');
            output += `${chalk.cyan(`- /${name}`)}: ${name} expertise\n`;
        });
        return output;
    }

    static getSkillContent(skillName: string): string | null {
        const filePath = path.join(this.SKILLS_DIR, `${skillName}.md`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        return null;
    }
}
