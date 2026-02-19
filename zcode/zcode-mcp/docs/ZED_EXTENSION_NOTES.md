# Zed Extension Development Notes

## Summary of Extension Capabilities

Based on https://zed.dev/docs/extensions/developing-extensions

### What Extensions Can Provide

1. **Languages** - Language support (syntax, LSP, etc.)
2. **Debuggers** - Debugging support
3. **Themes** - Color schemes
4. **Icon Themes** - Icon sets
5. **Slash Commands** - Custom commands in chat
6. **MCP Servers** - Model Context Protocol servers

### Extension Structure

```
my-extension/
  extension.toml       # Manifest (id, name, version, authors, etc.)
  Cargo.toml           # Rust/WASM dependencies
  src/
    lib.rs             # Extension code (Rust → WASM)
  languages/           # Language support
  themes/              # Theme files
```

### Development Process

1. **Local Development:**
   ```bash
   # Install as dev extension
   zed: install dev extension → select directory
   
   # Check logs
   zed: open log
   
   # Verbose output
   zed --foreground
   ```

2. **Publishing:**
   ```bash
   # Fork zed-industries/extensions
   git submodule add https://github.com/user/my-ext extensions/my-ext
   # Add to extensions.toml
   # Open PR
   ```

3. **License Required:**
   - MIT, Apache 2.0, BSD 2/3-Clause, GPL v3, LGPL v3, zlib
   - Required as of Oct 1, 2025

### Tech Stack

- **Language:** Rust
- **Target:** WebAssembly (WASM)
- **API:** `zed_extension_api` crate
- **Compilation:** Must have rustup-installed Rust

### Basic Extension Code

```rust
use zed_extension_api as zed;

struct MyExtension {
    // state
}

impl zed::Extension for MyExtension {
    // implement trait methods
}

zed::register_extension!(MyExtension);
```

## Implications for ZCode

### Current Architecture (Phase 1-3)
**ZCode as MCP Server (Python)**

✅ **Pros:**
- Simpler development (Python vs Rust/WASM)
- Works with any MCP-compatible tool (not Zed-specific)
- Faster iteration
- Existing Python ecosystem (Anthropic SDK, etc.)
- No compilation step

❌ **Cons:**
- No deep Zed integration
- Can't provide slash commands natively
- Can't access Zed internals
- Settings.json modification is external

### Future Option (Phase 5+)
**ZCode as Zed Extension (Rust/WASM)**

✅ **Pros:**
- Deep Zed integration
- Could provide slash commands (`/orchestrate`, `/plan`, etc.)
- Potentially programmatic profile switching (if API allows)
- Can bundle MCP servers within extension
- Better performance (WASM)
- Distribution via Zed extension registry

❌ **Cons:**
- Complete rewrite (Python → Rust)
- WASM compilation complexity
- Zed-specific (loses portability)
- More complex development workflow
- Longer development time

## Recommended Path

### Phase 1-3: MCP Server (Current)
Focus on orchestration layer as Python MCP server:
- Profile suggestion via `analyze_task`
- Workflow coordination
- Task delegation
- Settings.json modification via CLI
- Rules/skills generation

### Phase 4: Evaluate Extension Benefits
After MCP server is stable, evaluate:
- User feedback on current approach
- Need for slash commands
- Need for deeper integration
- Zed extension API maturity

### Phase 5+: Extension Migration (Optional)
If needed, convert to extension:
- Keep MCP server as backend
- Add extension frontend for UI/commands
- Hybrid approach: Extension wraps MCP server

## Hybrid Approach (Best of Both Worlds)

```
ZCode Extension (Rust/WASM)
  ↓ wraps/launches
ZCode MCP Server (Python)
  ↓ provides orchestration tools
Zed Agent
  ↓ uses tools from
ZCode + Serena + browser-tools
```

**Benefits:**
- Extension provides slash commands, UI integration
- MCP server provides orchestration logic
- Keep Python for business logic
- Use Rust only for Zed-specific integration

## Decision: Stay MCP-Only for Now

**Rationale:**
1. Simpler development (Python vs Rust/WASM)
2. Portable (works beyond Zed)
3. Settings.json modification achieves profile setup
4. MCP tools provide orchestration
5. Can always migrate to extension later

**When to reconsider:**
- User requests for slash commands (`/plan`, `/orchestrate`)
- Need for programmatic profile switching
- Zed API adds profile management
- Performance becomes bottleneck

## Extension Features We Could Add Later

### Slash Commands
```rust
// Potential future commands:
/orchestrate - Start orchestrated workflow
/plan - Switch to Architect profile + analyze task
/implement - Switch to Code profile + execute plan
/review - Switch to Review profile + analyze changes
/debug - Switch to Debug profile + systematic debugging
```

### UI Integration
- Profile suggestion indicator in status bar
- Workflow state visualization
- Task tree view
- MCP server health monitor

### Better Settings Integration
- Profile template selector UI
- Visual rule/skill editor
- MCP server installer UI (instead of CLI)

## Resources

- Extension Guide: https://zed.dev/docs/extensions/developing-extensions
- Extension API: https://docs.rs/zed_extension_api/latest/zed_extension_api/
- Extension Registry: https://github.com/zed-industries/extensions
- MCP Spec: https://modelcontextprotocol.io/

---

**Last Updated:** Phase 3 Planning  
**Status:** MCP server approach confirmed for Phase 1-4  
**Future:** Extension migration as Phase 5+ option
