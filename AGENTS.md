<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Coding Guidelines & Development Rules

### 1. Language & Naming Conventions
- **English for Code**: Write all variables, function names, types, interfaces, schemas, and technical comments in English.
- **Domain & UI Text**: Domain-specific Indonesian terms (e.g., SKP, ASN, Pegawai, Bulanan) and user-facing UI labels/messages remain in Indonesian.
- **File & Directory Naming**: Always use `kebab-case` for all file and folder names (e.g., `action-plan-menu.tsx`, `skp-store.ts`, `action-plan-schema.ts`).

### 2. Modularity & Reusability
- **Keep Files Concise**: Avoid bloated files. Break complex logic and views into focused, small, and reusable pieces.
- **Separate Components & Services**:
  - Encapsulate reusable UI blocks into modular components under `src/components/`.
  - Abstract data fetching, stores, validation, and business logic into dedicated services, hooks, or store files (e.g., `src/lib/services/`, `src/lib/stores/`, `src/lib/schemas/`).

### 3. Tooling & Ecosystem Verification
- **Package Installation via context7**:
  - Before installing or using external libraries/packages, query documentation and best practices using the `context7` MCP server tools (`resolve-library-id`, `query-docs`).
- **UI Components via shadcn MCP**:
  - When creating or needing new UI elements, always inspect and leverage the `shadcn` MCP server tools (e.g., `search_items_in_registries`, `view_items_in_registries`, `get_add_command_for_items`) to check available shadcn components before writing custom implementations.

