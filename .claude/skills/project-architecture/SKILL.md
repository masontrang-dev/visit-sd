---
name: project-architecture
description: "Reference documentation for this project's architecture, tech stack, and conventions. ALWAYS load this skill as a first step when starting any task in this project — it provides essential context for making correct decisions. Use it when answering questions about the codebase (tech stack, structure, how things work), before writing or modifying code, before making architectural decisions, when debugging or investigating issues, when onboarding to the project, or any time you need to understand where something lives or how components connect. When in doubt, load this skill — it's cheaper than exploring manually."
---

# Project Architecture

This skill contains reference documentation for understanding this project's architecture and conventions.

## How to Use

1. **Start with `references/index.md`** — It provides the high-level overview: what this project is, how it's organized, and links to detailed topic files.
2. **Read only what you need** — Each reference file is self-contained. If you're working on authentication, read the auth file. If you're debugging the API layer, read the API file. Don't load everything.
3. **File paths are relative to the repo root** — All paths mentioned in the reference docs are relative to the repository root directory.

This is a progressive-disclosure system. `index.md` orients you; topic files go deep. Load context only when you need it.
