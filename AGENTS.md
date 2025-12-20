# Repository Guidelines

## Project Structure & Module Organization

- `src/`: Raycast extension source. Command entrypoints live at `src/*.jsx` and should match `package.json` command names (e.g., `aiChat` → `src/aiChat.jsx`).
- `src/api/`: API/client logic and provider plumbing.
  - `src/api/Providers/`: per-provider implementations and model config.
- `src/components/`: shared UI components used by commands.
- `src/helpers/`: utilities (prompt handling, file processing, update helpers).
- `src/classes/`: core data models (e.g., chat/message types).
- `assets/`: icons and images used by commands (e.g., `assets/gpt-icon.png`).

## Build, Test, and Development Commands

- `npm ci`: reproducible install (matches CI).
- `npm run dev`: start Raycast dev mode (`ray develop`) for interactive testing in Raycast.
- `npm run build`: build the extension to `dist/` (`ray build -e dist`).
- `npm run lint`: run lint checks (`ray lint`).
- `npm run fix-lint`: auto-fix lint/format issues (`ray lint --fix --relaxed`).

CI currently runs on Node.js 20.

## Coding Style & Naming Conventions

- JavaScript/JSX with ESM (`type: "module"`): use `import`/`export` (avoid `require`).
- Formatting: Prettier (print width 120, double quotes). Prefer 2-space indentation and let tooling format.
- Naming: command files use `camelCase.jsx` (e.g., `askAboutSelectedText.jsx`); provider files are typically lowercase in `src/api/Providers/`.

## Testing Guidelines

- There is no dedicated unit test runner in this repository.
- Validate changes via `npm run lint` and `npm run build`, then smoke-test the affected command(s) using `npm run dev` in Raycast.

## Commit & Pull Request Guidelines

- Commits use short, imperative summaries (e.g., “Fix lint”, “Add Gemini 3 models”). Include provider/model names when relevant.
- PRs should include: a clear description, linked issue(s) if applicable, and screenshots/GIFs for UI changes.
- Before opening a PR, ensure `npm run lint` and `npm run build` pass locally.
- Never commit secrets (API keys/tokens). Use Raycast preferences or local env vars (e.g., `OPENAI_API_KEY`) for development.

