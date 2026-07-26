# Commit Convention

## Language

- Write commit subjects and bodies in English by default.
- Keep the subject concise and describe the completed change.
- Use a commit body when the reason, behavior, migration note, or verification result is useful.

## Format

Use Conventional Commit-style subjects:

```text
<type>: <short summary>
```

Available types:

- `feat`: user-facing feature
- `fix`: bug fix
- `refactor`: internal change without behavior change
- `docs`: documentation only
- `style`: formatting only
- `test`: tests
- `chore`: dependencies, tooling, configuration, or maintenance

Example with a body:

```text
feat: add Kakao login through Supabase

Configure the OAuth callback flow and session-aware login panel.
Document the required provider and redirect URL settings.
```

## Grouping Changes

Before committing:

1. Inspect all modified and untracked files.
2. Review the relevant diffs.
3. Group only files that belong to the same logical change.
4. Split unrelated changes into separate commits.
5. Use multiple commits when that makes the history easier to understand or revert.
6. Do not include real environment files or secrets.

A commit should represent one coherent outcome, not merely everything currently modified.

Examples of separate logical groups:

- authentication implementation and its configuration
- application icon or visual assets
- documentation and repository workflow rules

## Verification

Before the final commit or push:

- run checks appropriate to the changed files
- review `git diff --check`
- review the staged diff for each commit
- confirm the final commit list and working tree state

When the user requests a commit, choose the grouping and number of commits based on the actual changes unless the user specifies otherwise.
