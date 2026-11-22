# FlowForge

**FlowForge** is a VS Code visual logic editor for designing, inspecting, and maintaining program flow as editable `.flow.json` documents. The diagram is intended to remain human-readable and AI-friendly; FlowForge does not embed an AI chat feature.

> Current source baseline: **v0.8.2**. This repository is an active development snapshot, not a claim that every planned requirement has shipped or been verified.

## Features in the current source snapshot

- Grid-aligned canvas and block layout (22 px grid).
- Flow and Data ports with direction/type validation.
- Orthogonal connection paths with editable bends and lock state.
- Block selection, grouping, copy/paste, and persistent undo history (implementation status varies by feature; see the status document).
- Manual validation and step-based simulation features.
- Theme, grid, panel, and recent-file preferences consolidated into a versioned `settings.json`.
- Sidebar actions for **New Diagram**, **Open Diagram**, and **Open Recent Diagram**.
- AI development guidance and requirement traceability via `AGENTS.md` and `REQUIREMENTS/MASTER.md`.

## Current mouse interaction policy

- **Left-drag on empty canvas:** pan the canvas.
- **Right-drag:** marquee-select blocks and intersecting connections.
- **Right-click without dragging:** open the context menu.
- **Left-drag a block:** move the block.
- **Ctrl+A:** select all blocks and connections.
- **Space:** intentionally unassigned.

## Repository layout

```text
.
├── AGENTS.md
├── REQUIREMENTS/
│   └── MASTER.md
├── core/
├── docs/
├── examples/
├── media/
├── rust/
├── test/
└── package.json
```

## Development

Requirements:
- VS Code Extension development environment
- Node.js (for the extension and JavaScript tests)
- Python (for selected UI/integration tests)
- Rust toolchain (optional; the Rust component is source code and may require a separate build)

Useful checks:

```sh
node --check extension.js
node --check media/editor.js
node test/model.test.js
node test/simulation.test.js
cd rust && cargo test
```

See:
- [AI development rules](AGENTS.md)
- [Master requirements](REQUIREMENTS/MASTER.md)
- [AI workflow](docs/AI_WORKFLOW.md)
- [Implementation status and known limitations](docs/IMPLEMENTATION_STATUS.md)
- [Full requirements history](docs/FlowForge_FULL_REQUIREMENTS.md)

## Installation

A VSIX package is not included in this source repository snapshot. To package the extension, use the VS Code Extension Manager tooling appropriate to your development environment. Do not assume the source snapshot has been validated in a Windows VS Code Extension Host unless that test has actually been run.

## Contribution and change policy

1. Read the relevant requirement IDs before changing code; do not reread the entire project unnecessarily.
2. Preserve existing user changes and inspect `git diff`.
3. Make the smallest scoped change and add/update targeted tests.
4. Report test results as **pass**, **fail**, or **unverified**. Never claim an unrun test passed.
5. Update requirement/status documents when behavior or scope changes.
6. Show the diff and request explicit approval before committing. Push requires separate approval.

## License

No license has been specified yet. All rights are reserved by default until a license is added.
