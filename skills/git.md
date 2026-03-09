# Git & Version Control Mastery

## Core Principles
- **Atomic Commits**: Each commit should represent a single, logical change. Avoid "mega-commits".
- **Conventional Commits**: Use `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`.
- **Branching Strategy**: 
  - `main`: Production-ready code.
  - `develop`: Integration branch for features.
  - `feature/*`: New features.
  - `hotfix/*`: Urgent production fixes.

## Advanced Operations
- **Rebasing vs Merging**: Use `git rebase` to maintain a clean, linear history on feature branches. Use `git merge --no-ff` for integrating features into develop/main to preserve branch context.
- **Squashing**: Squash commits before merging to keep the history concise.
- **Cherry-picking**: Use `git cherry-pick <hash>` to bring specific fixes into other branches.
- **Stashing**: Use `git stash` for temporary context switching without committing half-baked work.

## Conflict Resolution
- Always pull changes (`git pull --rebase`) before starting work.
- Use a 3-way merge tool for complex conflicts.
- Verify build and tests pass *after* resolution but *before* final commit.

## Security & Best Practices
- **.gitignore**: Ensure `node_modules`, `.env`, `dist`, and OS-specific files (`.DS_Store`) are ignored.
- **Secrets**: Never commit API keys, tokens, or credentials. Use `git-filter-repo` if secrets are accidentally committed.
- **Hooks**: Use Husky/lint-staged to run linters and tests pre-commit.
