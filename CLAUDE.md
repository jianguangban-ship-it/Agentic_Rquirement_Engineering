# CLAUDE.md

This file provides guidance for AI assistants (including Claude) working on the **Agentic Requirement Engineering** project.

## Project Overview

**Agentic Requirement Engineering** is a project focused on applying AI agent-based approaches to software requirement engineering workflows. The repository is in its initial stage of development.

- **Repository**: `jianguangban-ship-it/Agentic_Rquirement_Engineering`
- **Status**: Early development / greenfield project

## Repository Structure

```
Agentic_Rquirement_Engineering/
├── CLAUDE.md          # This file — AI assistant guidelines
└── (project files to be added)
```

> **Note**: This section should be updated as directories and modules are added.

## Development Setup

_No build system or dependencies have been configured yet._ Update this section when a language, framework, or package manager is chosen.

### Prerequisites

- Git

### Getting Started

```bash
git clone <repo-url>
cd Agentic_Rquirement_Engineering
# Additional setup steps to be added
```

## Build & Run

_Not yet configured._ Update this section when build tooling is established.

## Testing

_No test framework has been configured yet._ Update this section when tests are introduced.

## Code Conventions

### General Principles

- Keep code simple, readable, and well-structured.
- Prefer clarity over cleverness.
- Follow the single responsibility principle for functions and modules.
- Write meaningful commit messages that explain _why_, not just _what_.

### Branching Strategy

- Feature branches should use descriptive names.
- Claude-generated branches follow the pattern: `claude/<description>-<session-id>`.

### File Organization

- Group related functionality into clearly named directories.
- Keep configuration files in the project root.
- Place documentation in a `docs/` directory when it grows beyond the README.

## AI Assistant Guidelines

When working on this repository, AI assistants should:

1. **Read before writing** — Always read existing files before proposing changes.
2. **Stay focused** — Only make changes that are directly requested or clearly necessary.
3. **Avoid over-engineering** — Do not add abstractions, helpers, or features beyond what is asked for.
4. **Update this file** — When significant structural changes are made (new directories, frameworks, dependencies, build tools, or conventions), update CLAUDE.md to reflect them.
5. **Track work** — Use todo lists to plan and track multi-step tasks.
6. **Ask when uncertain** — If requirements are ambiguous, ask for clarification rather than guessing.
7. **Security first** — Do not introduce code vulnerable to injection, XSS, or other OWASP top 10 issues.
8. **Test coverage** — When a test framework is in place, write tests for new functionality.
