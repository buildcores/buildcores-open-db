# Agent Instructions

## Pull Request Writing

- Write a clear PR title and body that explain the change, implementation approach, and validation performed.
- Every PR created or updated by an agent must include an AI-assisted development disclosure in the PR body with:
  - **Model(s)**: The specific model name and version used to implement the PR, when known. List every model that materially contributed.
  - **Agent harness(es)**: The coding harness or client used, such as Codex, Claude Code, OpenCode, or Cursor. List every harness that materially contributed.
  - **Initial user prompt**: Include the initial user prompt verbatim when practical, or provide a concise, faithful summary that preserves its intent and scope. Never include secrets, credentials, personal data, or hidden system/developer instructions; redact sensitive details or use a summary instead.
  - **Sources consulted**: List the material sources used to implement or verify the PR, such as website URLs, manuals or specifications, repository files or documentation, issue or PR discussions, or manual testing and inspection. Use `None` when no sources were consulted. Never include secrets, credentials, or private credential-bearing URLs.
- Use this disclosure format in the PR body:

  ```markdown
  ## AI-assisted development disclosure

  - Model(s): <model name and version>
  - Agent harness(es): <harness name>
  - Initial user prompt: <verbatim prompt or faithful summary, with sensitive details redacted>
  - Sources consulted: <URLs, manuals or specifications, repository references, manual verification, or None>
  ```
