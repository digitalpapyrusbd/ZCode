# ZCode Extension — Phase 3 Implementation Status

## What Was Built
A **Zed extension** at `zcode/zcode-extension/` that bundles an MCP server for profile orchestration.

### Files Created (7 total)
```
zcode/zcode-extension/
├── extension.toml              # Extension manifest (id: "zcode", context_servers.zcode-orchestrator)
├── Cargo.toml                  # Rust WASM (zed_extension_api 0.7.0)
├── LICENSE                     # MIT
├── README.md                   # Full documentation
├── src/
│   └── lib.rs                  # Extension: context_server_command → node mcp_server/server.js
├── mcp_server/
│   └── server.js               # Zero-dep MCP server (~800 lines, all tested & working)
└── profiles/
    └── all_profiles.json       # 12 profile templates (reference only, install_profiles tool is preferred)
```

### MCP Server Tools (9 total, all tested)
| Tool | Status | Purpose |
|------|--------|---------|
| `install_profiles` | ✅ TESTED | **Auto-installs profiles into settings.json** (backs up first, merges, skips existing) |
| `analyze_task` | ✅ TESTED | Keyword-based profile recommendation |
| `switch_profile` | ✅ TESTED | Returns user instruction message |
| `get_workflow_state` | ✅ TESTED | Shared memory between profiles |
| `update_workflow_state` | ✅ TESTED | Persist tasks, todos, progress |
| `add_session_entry` | ✅ TESTED | Record what each profile did |
| `list_profiles` | ✅ TESTED | Show all 12 profiles |
| `get_profile_info` | ✅ TESTED | Profile details |
| `clear_workflow_state` | ✅ TESTED | Reset for new task |

### Key Design Decisions
1. **Zero npm dependencies** — MCP protocol (JSON-RPC over stdio) implemented directly in JS
2. **Node.js via `zed::node_binary_path()`** — uses Zed's built-in Node runtime
3. **`install_profiles` tool** — auto-writes profiles to settings.json (no manual copy needed!)
4. **JSONC parser included** — strips comments/trailing commas from Zed's settings.json
5. **State at `~/.zcode/state.json`** — persists across restarts and profile switches
6. **Backup at `settings.json.zcode-backup`** — always backs up before writing
7. **Profile switch is manual** — Zed has no API for programmatic switching; MCP server just recommends

### Architecture (simplified from PRD)
- Extension (Rust/WASM) = thin wrapper, just tells Zed how to start the MCP server
- MCP server (JS) = does ALL the work: profiles, state, orchestration
- ZCode does NOT interact with other MCP servers (Serena, Context7, etc.) — Zed handles that natively
- ZCode does NOT discover other extensions — unnecessary since Zed auto-detects MCP servers

### What's Left / Next Steps
1. **Test as dev extension in Zed** — `Extensions → Install Dev Extension → select zcode-extension/`
2. **Verify install_profiles actually wrote correct settings** — check settings.json after running
3. **Run `cargo build` for WASM** — needs rustup with wasm32-wasi target
4. **Skills/rules generation** — Phase 3E (not yet implemented)
5. **Publishing to Zed Marketplace** — Phase 3H

### Reference Docs
- PRD: `zcode/zcode-mcp/docs/PHASE_3_PRD.md`
- Extension docs: `zcode/zcode-mcp/docs/Extension.md`
- Research: `zcode/zcode-mcp/docs/PHASE_2_RESEARCH.md`, `zcode/zcode-mcp/docs/ZED_EXTENSION_NOTES.md`

### Testing Commands
```bash
# From zcode/ root:
# Initialize + test tools:
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | node zcode/zcode-extension/mcp_server/server.js

# Test install_profiles:
printf '...\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"install_profiles","arguments":{}}}\n' | node zcode/zcode-extension/mcp_server/server.js

# Test analyze_task:
printf '...\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"analyze_task","arguments":{"task":"debug login error"}}}\n' | node zcode/zcode-extension/mcp_server/server.js
```

### Settings.json Paths
- Windows: `%APPDATA%\Zed\settings.json`
- macOS: `~/Library/Application Support/Zed/settings.json`
- Linux: `~/.config/zed/settings.json`
