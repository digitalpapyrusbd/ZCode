# ZCode - AI Mode Orchestrator for Zed for Zed

A Zed extension that brings Kilo Code-style mode orchestration to Zed AI assistant.

## Features

- **Mode Management**: Define custom AI modes with specific roles, permissions, and model preferences
- **Smart Orchestration**: Automatically select the right mode for each task
- **Sticky Models**: Remember model preferences per mode
- **Permission Groups**: Control file access and tool permissions per mode
- **Project-Aware**: Load modes from `.kilocodemodes` in your project

## Installation (Dev Mode)

1. Ensure Rust is installed: `rustup target add wasm32-unknown-unknown`
2. Clone this repository into your project
3. Open Zed and run: `zed: install dev extension`
4. Select the `zcode` directory

## Configuration

Create a `.kilocodemodes` file in your project root:

```yaml
customModes:
  - slug: frontend-specialist
    name: Frontend Specialist
    roleDefinition: |
      You are a frontend developer expert...
    groups:
      - read
      - browser
      - - edit
        - fileRegex: \.(tsx?|jsx?|css)$
          description: Frontend files only
    customInstructions: |
      Focus on React best practices...
    source: project
```

## Slash Commands

- `/mode <slug>` - Switch to a specific mode
- `/modes` - List all available modes
- `/orchestrate <task>` - Let the orchestrator choose the best mode

## Architecture

```
extension.toml          → Zed extension manifest
Cargo.toml              → Rust dependencies
src/
  lib.rs                → Main extension entry point
  modes.rs              → Mode parsing and registry
  orchestrator.rs       → Mode selection logic
  commands.rs           → Slash command handlers
```

## Development

```bash
# Build WASM
cargo build --release --target wasm32-unknown-unknown

# The output is at:
# target/wasm32-unknown-unknown/release/zed_kilo_orchestrator.wasm

# Zed will reload the extension automatically on rebuild
```

## Status

🚧 **Work in Progress** - Phase 1 (Configuration & Parsing)

- [x] Extension scaffolding
- [x] Mode definition types
- [ ] Parse .kilocodemodes
- [ ] Slash commands
- [ ] Mode registry
- [ ] Orchestration logic
- [ ] Model binding
- [ ] Permission enforcement

## License

MIT
