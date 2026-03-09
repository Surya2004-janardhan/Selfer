# CLI Engineering & Tooling

## Design Principles
- **Discoverability**: Implement comprehensive `--help` flags and clear error messages.
- **Interactivity**: Use `inquirer` or `enquirer` for user-friendly prompts and selections.
- **Aesthetics**: Use `chalk` for categorization and `ora` for long-running task visualization.

## Engineering Best Practices
- **Argument Parsing**: Use robust libraries like `commander` or `yargs`.
- **Global Installation**: Configure the `bin` field in `package.json` and ensure cross-platform compatibility.
- **Persistent State**: Manage configuration and history in home directories or local `.selfer` folders.
- **Performance**: Optimize startup time by lazy-loading heavy dependencies.

## Security
- **Path Sanitization**: Ensure all file operations are scoped to the project directory unless explicitly requested.
- **Input Validation**: Sanitize all user inputs before passing them to sub-processes or file systems.

## Distribution
- **Packaging**: Use TypeScript to ensure type safety and build a deployable `dist/` directory.
- **Versioning**: Follow semantic versioning (SemVer) for updates.