# Quick Reference — Zed Kilo Orchestrator

## Commands (Future)

Once integrated with Zed:

```
/modes                          → List all available modes
/mode <slug>                    → Switch to specific mode
/orchestrate <task description> → Get mode suggestion for task
```

## Mode Definition Format

```yaml
customModes:
  - slug: mode-identifier          # URL-safe identifier
    name: Human Readable Name      # Display name
    roleDefinition: |              # System prompt / role description
      Multi-line description...
    groups:                        # Permission groups
      - read                       # Simple permission
      - browser
      - - edit                     # File-restricted permission
        - fileRegex: \.(tsx?|jsx?)$
          description: TypeScript/JavaScript only
    customInstructions: |          # Additional instructions
      More guidance...
    stickyModel: claude-sonnet-4   # Optional: preferred model
    source: project                # 'project' or 'global'
```

## Mode Permission Groups

| Group | Allows |
|-------|--------|
| `read` | Read any file |
| `edit` | Edit any file (or restricted by `fileRegex`) |
| `command` | Execute shell commands |
| `browser` | Web browsing / fetch |
| `mcp` | Call MCP tools |

## File Structure

```
your-project/
├── .kilocodemodes              ← Mode definitions (YAML)
├── .kilo/                      ← Optional state dir
│   └── state.json              ← Current mode, sticky models
└── zcode/      ← Extension (if dev install)
    ├── extension.toml
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── modes.rs
        ├── orchestrator.rs
        └── commands.rs
```

## Development

```bash
# Build extension
cd zcode
cargo build --release --target wasm32-unknown-unknown

# Install in Zed
zed --foreground
# Then: Cmd/Ctrl+Shift+P → "zed: install dev extension"
# Select: path/to/zcode

# Watch extension logs
# (Extension prints to Zed's console when run with --foreground)
```

## Troubleshooting

### Extension not loading

1. Check `extension.toml` syntax
2. Verify `Cargo.toml` has correct crate-type
3. Rebuild WASM: `cargo build --release --target wasm32-unknown-unknown`
4. Check Zed console for errors: `zed --foreground`

### Modes not loading

1. Verify `.kilocodemodes` is in project root
2. Check YAML syntax with `yamllint .kilocodemodes`
3. Look for parse errors in Zed console
4. Ensure `customModes` key exists and is an array

### Mode switching not working

1. Check if mode slug exists: `/modes`
2. Verify mode slug matches exactly (case-sensitive)
3. Check permission groups are valid

## Architecture

```
User → Zed UI → Extension → ModeRegistry → .kilocodemodes
                    ↓
            Orchestrator → Suggest mode
                    ↓
            Commands → /mode, /modes, /orchestrate
```

## Example Usage

```yaml
# .kilocodemodes in your project
customModes:
  - slug: frontend-dev
    name: Frontend Developer
    roleDefinition: |
      Expert in React, TypeScript, and CSS.
    groups:
      - read
      - browser
      - - edit
        - fileRegex: \.(tsx?|jsx?|css|scss)$
    customInstructions: |
      Focus on:
      - Accessibility (WCAG AA)
      - Responsive design
      - Performance optimization
    source: project
```

```
# In Zed assistant
/modes
# → Lists "Frontend Developer" and others

/mode frontend-dev
# → Activates Frontend Developer mode

/orchestrate Create a responsive navigation component
# → Suggests: frontend-dev
```

## Extending

### Add a new mode

1. Edit `.kilocodemodes`
2. Add new mode to `customModes` array
3. Reload Zed or re-open project
4. Run `/modes` to verify

### Add custom orchestration logic

1. Edit `src/orchestrator.rs`
2. Modify `suggest_mode()` keyword matching
3. Or implement LLM-based routing via MCP
4. Rebuild and reinstall extension

### Add new slash commands

1. Edit `src/commands.rs`
2. Add handler function
3. Register in `src/lib.rs` (when API available)
4. Rebuild and reinstall

## Status

- ✅ Phase 1: Extension scaffolding complete
- 🚧 Phase 2: Zed integration in progress
- ⏳ Phase 3: Advanced features planned

## Next Steps

1. Research Zed Extension API for slash command hooks
2. Implement state persistence in `.kilo/state.json`
3. Test mode switching with real .kilocodemodes
4. Add UI indicator for current mode

## Links

- [Full Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [README](./README.md)
- [Zed Docs](https://zed.dev/docs/extensions)
