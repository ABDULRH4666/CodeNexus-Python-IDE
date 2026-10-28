# CodeNexus Python IDE

CodeNexus is a browser-based Python IDE prototype for writing, running, saving, and exploring Python code directly in the browser with a responsive UI and local project management.

## Features

- Python editor with Monaco
- Local project persistence via IndexedDB and LocalStorage
- Pyodide-based Python runtime execution
- Dark/Light mode and bilingual UI with RTL/LTR support
- File explorer and project templates
- AI assistant demo mode with safe fallback messaging
- Export project as ZIP

## Stack

- React + Vite
- Monaco Editor
- Pyodide
- IndexedDB / LocalStorage
- Vitest + Testing Library

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open the local Vite address shown in the terminal.

## Production build

```bash
npm run build
```

## Test suite

```bash
npm test
```

## Notes

- The runtime uses Pyodide in-browser, so some Python packages and system functions are limited compared to a full local Python environment.
- The AI panel is intentionally a demo mode unless a real provider is configured.
