import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class SkillManager {
    private static SKILLS_DIR = 'skills';

    private static DEFAULT_SKILLS = [
        {
            name: 'master.md',
            content: '# Master Skill\nAs the Master Agent, you are the conductor of the Selfer framework...'
        },
        {
            name: 'git.md',
            content: '# Git & Version Control\nExpertise in managing project history and collaboration...'
        },
        {
            name: 'backend.md',
            content: '# Backend Architecture\nDomain knowledge for server-side development...'
        },
        {
            name: 'frontend.md',
            content: '# Frontend Development\nVisualizing and perfecting the user experience...'
        }
    ];

    static init() {
        if (!fs.existsSync(this.SKILLS_DIR)) {
            fs.mkdirSync(this.SKILLS_DIR);
        }

        this.DEFAULT_SKILLS.forEach(skill => {
            const filePath = path.join(this.SKILLS_DIR, skill.name);
            if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim() === '') {
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
