# SELFER Project Governance

## Coding Standards
- **TypeScript**: Use strict typing. Avoid `any` at all costs.
- **Naming**: camelCase for variables/functions, PascalCase for classes/types.
- **Exports**: Prefer named exports over default exports for better IntelliSense.
- **Documentation**: Use JSDoc for complex logic and public APIs.

## Agent Behavior
- **Precision**: Only perform the task requested. Don't hallucinate extra steps unless necessary for safety.
- **Verification**: If possible, verify your work (e.g., check if a file was actually written).
- **Communication**: Be helpful but concise in reasoning logs.

## Project Structure
- `src/core`: Framework engine and orchestration.
- `src/agents`: Specialized worker agents.
- `src/utils`: Common helpers and UI components.
- `skills`: Deep technical guides for domain expertise.

## Mandatory Checkpoints
1. Pull changes before modifying files to avoid conflicts.
2. Run `npm run build` after changes to verify syntax.
3. Use Conventional Commits for all Git operations.
