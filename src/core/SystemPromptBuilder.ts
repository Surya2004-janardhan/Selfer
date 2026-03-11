import { Tool } from './ToolRegistry';
import * as os from 'os';

export interface PromptContext {
    cwd: string;
    platform: string;
    shell: string;
    date: string;
    tools: Tool[];
    activeTerminals?: string[];
}

export class SystemPromptBuilder {
    static build(context: PromptContext): string {
        const sections = [
            this.getRoleSection(),
            this.getToolSection(context.tools),
            this.getEditingRulesSection(),
            this.getEnvironmentSection(context),
            this.getGeneralRulesSection(),
            this.getObjectiveSection()
        ];

        return sections.filter(Boolean).join('\n\n====\n\n');
    }

    private static getRoleSection(): string {
        return `You are Selfer, a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.
You are direct, technical, and to the point. You avoid conversational fillers and prioritize solving the task efficiently.`;
    }

    private static getToolSection(tools: Tool[]): string {
        return `TOOL USE

You have access to the following tools. To use a tool, you must wrap the tool call in custom XML tags.
Every tool call MUST be formatted exactly like this:
<tool_name>
<param_name>value</param_name>
</tool_name>

AVAILABLE TOOLS:
${tools.map(t => this.formatTool(t)).join('\n\n')}`;
    }

    private static formatTool(tool: Tool): string {
        return `## ${tool.name}
Description: ${tool.description}
Parameters:
${Object.entries(tool.parameters.properties || {}).map(([name, schema]) => `- ${name}: (${tool.parameters.required?.includes(name) ? 'required' : 'optional'}) ${schema.description || ''}`).join('\n')}`;
    }

    private static getEditingRulesSection(): string {
        return `EDITING FILES

- Default to 'apply_search_replace' for most changes. It's safer and minimises issues.
- Use 'write_file' only for new files or complete overhauls.
- When using 'apply_search_replace', you MUST provide exact SEARCH/REPLACE blocks.
- Every SEARCH section must EXACTLY MATCH the existing file content, character for character, including all whitespace and indentation.
- Include enough lines in SEARCH to uniquely match the target block (at least 3–5 lines of context).
- To read a file before editing use 'read_file' (FileAgent) or 'read_file_for_edit' (EditsAgent).`;
    }

    private static getEnvironmentSection(context: PromptContext): string {
        return `SYSTEM INFORMATION

- Operating System: ${context.platform}
- Current Working Directory: ${context.cwd}
- Default Shell: ${context.shell}
- Current Date: ${context.date}
${context.activeTerminals?.length ? `- Actively Running Terminals: ${context.activeTerminals.join(', ')}` : ''}`;
    }

    private static getGeneralRulesSection(): string {
        return `RULES

- You operate STRICTLY from the current working directory: ${process.cwd()}.
- DO NOT use conversational fillers like "Great", "Certainly", "Okay", or "Sure".
- Be concise and technical.
- Think step-by-step and explain your reasoning in a few short sentences before calling a tool.
- At the end of your task, use the 'attempt_completion' tool to present your final result.
- NEVER end a completion with a question. Formulate it as a final statement.`;
    }

    private static getObjectiveSection(): string {
        return `OBJECTIVE

Your goal is to accomplish the user's task using the tools provided. Observe the results of your actions and iterate until the goal is met.`;
    }
}
