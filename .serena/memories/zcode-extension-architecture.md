# ZCode Extension Architecture

## Location
`zcode/zcode-extension/`

## Structure
```
zcode-extension/
├── extension.toml              # Extension manifest (id: "zcode")
├── Cargo.toml                  # Rust WASM (zed_extension_api 0.7.0)
├── LICENSE                     # MIT
├── README.md
├── src/
│   └── lib.rs                  # Extension: context_server_command returns node + server.js
├── mcp_server/
│   └── server.js               # Zero-dep MCP server (JSON-RPC over stdio)
└── profiles/
    └── all_profiles.json       # 12 profile templates for settings.json
```

## How It Works
1. Extension declares `[context_servers.zcode-orchestrator]` in extension.toml
2. `lib.rs` implements `context_server_command()` → runs `node mcp_server/server.js`
3. MCP server provides 8 orchestration tools (analyze_task, switch_profile, get/update workflow state, etc.)
4. State persisted at `~/.zcode/state.json`
5. Profile templates in `profiles/all_profiles.json` — user copies to settings.json

## MCP Server Tools
- analyze_task — keyword-based profile recommendation
- switch_profile — returns user instruction message (can't auto-switch)
- get_workflow_state — shared memory between profiles
- update_workflow_state — persist task progress
- add_session_entry — record what each profile did
- list_profiles — show available profiles
- get_profile_info — profile details
- clear_workflow_state — start fresh

## Key Design Decisions
- Zero npm dependencies — MCP protocol implemented directly in JS
- Node.js via `zed::node_binary_path()` — uses Zed's built-in Node
- Profiles are NOT auto-installed — user copies from template (WASM can't write settings.json)
- Profile switching is always manual (Zed limitation) — MCP server just recommends
