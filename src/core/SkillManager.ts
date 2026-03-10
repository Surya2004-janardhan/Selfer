import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class SkillManager {
    private static SKILLS_DIR = 'skills';

    private static DEFAULT_SKILLS = [
        {
            name: 'master.md',
            content: `---
name: master
description: High-level orchestration and strategic planning across agent teams.
---
# Master Orchestration

## Strategic Oversight
- **Context Preservation**: Always maintain the "Why" behind a user's request.
- **Agent Orchestration**: Delegate to the most efficient agent for the specific sub-task.
- **Decision Logic**: Iterative refinement and ROI on task priority.`
        },
        {
            name: 'git.md',
            content: `---
name: git
description: Proficiency in version control, atomic commits, branching, and conflict resolution.
---
# Git & Version Control Mastery

## Core Principles
- **Atomic Commits**: Single, logical changes.
- **Branching**: Conventional branching (main, develop, feature/*).
- **Conflicts**: Rebase-first approach for clean linear history.`
        },
        {
            name: 'backend.md',
            content: `---
name: backend
description: Expertise in clean architecture, API design, security, and database optimization.
---
# Backend Architecture & Systems

## Design
- **Clean Architecture**: Separation of concerns.
- **API Engineering**: RESTful maturity and schema-first design.
- **Security**: JWT, Encryption, and OWASP mitigation.`
        },
        {
            name: 'typescript.md',
            content: `---
name: typescript
description: Advanced TypeScript patterns, performance optimization, and strict typing best practices.
---
# TypeScript Excellence

## Advanced Patterns
- **Discriminated Unions**: For robust state management.
- **Generic Optimization**: Reuse logic without losing type safety.
- **Utility Types**: Use Record, Partial, Omit to simplify interfaces.

## Best Practices
- **Strict Mode**: Always adhere to 'strict' compiler settings.
- **Zod Validation**: Use schema validation at the system boundaries.`
        },
        {
            name: 'testing.md',
            content: `---
name: testing
description: Comprehensive testing strategies including Unit, Integration, and E2E patterns.
---
# Testing Playbook

## Strategy
- **Isolation**: Unit tests should have zero external dependencies.
- **Mocking Strategy**: Mock at the boundaries (APIs, DBs).
- **Coverage**: Aim for 80%+ but prioritize path complexity over line count.

## Tools
- **Jest/Vitest**: Preferred for unit and integration logic.
- **Playwright**: Preferred for E2E and visual regression.`
        }
    ];

    static init() {
        if (!fs.existsSync(this.SKILLS_DIR)) {
            fs.mkdirSync(this.SKILLS_DIR);
        }

        this.DEFAULT_SKILLS.forEach(skill => {
            const filePath = path.join(this.SKILLS_DIR, skill.name);
            if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim().length < 50) {
                fs.writeFileSync(filePath, skill.content);
            }
        });
    }

    private static parseMetadata(content: string): { name: string, description: string } {
        const match = content.match(/^---([\s\S]*?)---/);
        if (!match) return { name: 'Unknown', description: 'No description provided.' };

        const frontmatter = match[1];
        const nameMatch = frontmatter.match(/name:\s*(.*)/);
        const descMatch = frontmatter.match(/description:\s*(.*)/);

        return {
            name: nameMatch ? nameMatch[1].trim() : 'Unknown',
            description: descMatch ? descMatch[1].trim() : 'No description provided.'
        };
    }

    static getSkillsList(): string {
        const files = fs.readdirSync(this.SKILLS_DIR).filter(f => f.endsWith('.md'));
        if (files.length === 0) return "No skills found.";

        let output = chalk.blue.bold('\n--- Registered Skills (SKILL.md Standard) ---\n');
        files.forEach(file => {
            const content = fs.readFileSync(path.join(this.SKILLS_DIR, file), 'utf-8');
            const meta = this.parseMetadata(content);
            output += `${chalk.cyan(`- /${meta.name}`)}: ${meta.description}\n`;
        });
        return output;
    }

    static getSkillContent(skillName: string): string | null {
        const filePath = path.join(this.SKILLS_DIR, `${skillName.toLowerCase()}.md`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        return null;
    }

    static getSkillForAgent(agentName: string): string | null {
        const mapping: Record<string, string> = {
            'GitAgent': 'git',
            'FileAgent': 'cli',
            'BackendAgent': 'backend',
            'FrontendAgent': 'frontend',
            'CodeAgent': 'backend',
            'EditsAgent': 'backend'
        };
        const skillName = mapping[agentName];
        return skillName ? this.getSkillContent(skillName) : this.getSkillContent('master');
    }
}
