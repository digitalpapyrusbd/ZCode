# ZCode — Implementation Plan

**Project:** Zed extension implementing Kilo Code-style mode orchestration  
**Status:** Phase 1 Scaffolding Complete  
**Date:** 2026-02-16

---

## ✅ COMPLETED — Phase 1: Extension Scaffolding

### Files Created

```
RFQ_Buddy/zcode/
├── extension.toml              ← Zed manifest
├── Cargo.toml                  ← Rust dependencies
├── .gitignore                  ← Build artifacts
├── README.md                   ← User documentation
└── src/
    ├── lib.rs                  ← Main extension entry point
    ├── modes.rs                ← Mode definitions & registry
    ├── orchestrator.rs         ← Mode selection logic
    └── commands.rs             ← Slash command handlers
```

### Architecture Overview

```
┌──────────────────────────────────────────────────┐
│          Zed Extension API                       │
│   (loads extension, provides hooks)              │
└─────────────────┬────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────┐
│          lib.rs (Extension Entry Point)          │
│   - Implements zed::Extension trait              │
│   - Loads .kilocodemodes on startup              │
│   - Initializes ModeRegistry                     │
└─────────────────┬────────────────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
┌──────────┐ ┌─────────────┐ ┌───────────┐
│ modes.rs │ │ orchestrator│ │ commands  │
│          │ │    .rs      │ │   .rs     │
│ Mode     │ │             │ │           │
│ Registry │ │ Suggest     │ │ /mode     │
│          │ │ Mode        │ │ /modes    │
│ Parse    │ │             │ │ /orch..   │
│ YAML     │ │ Route Task  │ │           │
└──────────┘ └─────────────┘ └───────────┘
```

### What We Have

1. **Mode Type System** (`modes.rs`):
   - `Mode` struct matching .kilocodemodes schema
   - `PermissionGroup` enum (simple vs file-restricted)
   - `ModeRegistry` for CRUD operations
   - YAML parsing with serde_yaml

2. **Orchestration Logic** (`orchestrator.rs`):
   - Keyword-based mode suggestion
   - Prompt generation for LLM-based routing
   - Extensible for MCP integration

3. **Command Handlers** (`commands.rs`):
   - `/modes` — list all modes
   - `/mode <slug>` — switch to mode
   - `/orchestrate <task>` — suggest mode

4. **Tests**:
   - Unit tests for parsing
   - Unit tests for orchestration
   - Unit tests for commands

---

## 🚧 TODO — Phase 2: Zed Integration (Next Steps)

### 2.1 Slash Command Registration

**Current limitation:** Zed Extension API (`zed_extension_api 0.2.0`) may not expose slash command registration directly.

**Action Items:**
- [ ] Research latest Zed extension docs for slash command hooks
- [ ] Check if slash commands must be exposed via MCP instead
- [ ] Implement command registration or fall back to MCP server approach

**Options:**
- **A. Native Slash Commands** (if API supports):
  ```rust
  impl zed::Extension for KiloOrchestratorExtension {
      fn slash_commands(&self) -> Vec<zed::SlashCommand> {
          vec![
              zed::SlashCommand::new("mode", handle_mode_slash),
              zed::SlashCommand::new("modes", handle_modes_slash),
              zed::SlashCommand::new("orchestrate", handle_orchestrate_slash),
          ]
      }
  }
  ```

- **B. MCP Server Fallback** (if slash commands not available):
  - Create a separate MCP server (Python or Node.js)
  - Expose tools via MCP: `kilo_mode_switch`, `kilo_list_modes`, `kilo_orchestrate`
  - Extension acts as UI layer, MCP handles logic

### 2.2 State Persistence

**Need:** Store current mode and sticky model preferences across Zed sessions.

**Action Items:**
- [ ] Use Zed's key-value store (if available) or filesystem
- [ ] Persist: `current_mode`, `last_model_per_mode`
- [ ] Load state on extension initialization

**Implementation:**
```rust
struct ExtensionState {
    current_mode: Option<String>,
    sticky_models: HashMap<String, String>, // mode_slug -> model_name
}

impl ExtensionState {
    fn save(&self, worktree: &zed::Worktree) { /* ... */ }
    fn load(worktree: &zed::Worktree) -> Self { /* ... */ }
}
```

### 2.3 Model Switching Hook

**Challenge:** Zed may not expose direct model switching API.

**Action Items:**
- [ ] Research Zed API for programmatic model selection
- [ ] If not available, use prompt injection: prefix every prompt with mode context
- [ ] Alternative: Use MCP to wrap model calls with mode-specific context

**Workaround (prompt injection):**
```rust
fn inject_mode_context(user_prompt: &str, mode: &Mode) -> String {
    format!(
        "# Mode: {} ({})\n{}\n\n---\n\nUser task:\n{}",
        mode.name,
        mode.slug,
        mode.role_definition,
        user_prompt
    )
}
```

### 2.4 Permission Enforcement

**Need:** Block file edits outside mode's `fileRegex` permissions.

**Action Items:**
- [ ] Hook into Zed's file editing pipeline (if exposed)
- [ ] Intercept edit commands and validate against current mode's `groups`
- [ ] Show warning/error if permission denied

**Fallback:** Document permissions in mode instructions and rely on LLM compliance.

---

## 🎯 Phase 3: Advanced Features (Future)

### 3.1 Context Preservation Across Mode Switches

**Feature:** Maintain conversation context when switching modes.

**Design:**
- Store last N messages in memory
- Inject context summary when switching
- Optionally truncate or summarize large contexts

### 3.2 LLM-Based Orchestration (via MCP)

**Feature:** Use LLM to intelligently route tasks to modes.

**Design:**
```
User task → Orchestrator → MCP call → LLM analyzes task + mode definitions
                                  ↓
                        Returns: { mode: "slug", reasoning: "..." }
                                  ↓
Extension receives MCP response → switches mode → proceeds
```

**Action Items:**
- [ ] Create MCP tool: `orchestrate_mode_selection`
- [ ] Pass task + mode definitions as JSON
- [ ] Parse LLM response and switch mode

### 3.3 Mode Marketplace

**Feature:** Share/import modes from community.

**Design:**
- Central mode repository (GitHub)
- `zed: import mode <url>` command
- Merge imported modes with project-local modes

### 3.4 Hierarchical Modes

**Feature:** Modes can delegate to sub-modes.

**Example:**
```yaml
- slug: orchestrator
  name: Orchestrator
  canDelegate: true
  delegateTo: [frontend-specialist, test-engineer, docs-specialist]
```

### 3.5 UI Indicators

**Feature:** Visual indicator of current mode in Zed UI.

**Design:**
- Status bar item showing current mode
- Clickable to open mode picker
- Color-coded by mode type

---

## 🧪 Testing Strategy

### Unit Tests (Rust)

- [x] Mode parsing from YAML
- [x] Mode registry CRUD
- [x] Orchestrator keyword matching
- [x] Command handler outputs
- [ ] State persistence
- [ ] Permission validation

### Integration Tests

- [ ] Load .kilocodemodes from real project
- [ ] Switch modes via slash commands
- [ ] Verify prompt injection
- [ ] Test MCP server communication (if implemented)

### Manual Testing in Zed

1. Install dev extension: `zed: install dev extension`
2. Open RFQ_Buddy project
3. Test slash commands:
   - `/modes` → should list 6 custom modes
   - `/mode code-skeptic` → should activate Code Skeptic
   - `/orchestrate write tests` → should suggest Test Engineer
4. Verify mode instructions appear in prompts
5. Test file permission enforcement (if implemented)

---

## 🚀 Deployment Plan

### Phase 1: Local Dev Extension (Current)

- Use `zed: install dev extension` for testing
- Iterate on features locally
- Gather feedback from team

### Phase 2: Publish to Zed Extensions Marketplace

**Requirements:**
- Accepted license (MIT or similar)
- Submit PR to `zed-industries/extensions` repo
- Pass Zed team review
- Documentation and examples

**Steps:**
1. Finalize extension manifest
2. Write comprehensive README
3. Add screenshots/demo video
4. Submit PR with `extensions/kilo-orchestrator/extension.toml`
5. Address review feedback
6. Merge and publish

### Phase 3: Community Adoption

- Blog post explaining features
- Tutorial videos
- Mode template repository
- Integration examples for popular frameworks

---

## 📋 Open Questions & Decisions

### 1. Slash Commands: Native vs MCP?

**Options:**
- **A. Native** — Better UX, tighter integration
- **B. MCP** — More flexible, easier to prototype

**Decision:** Try native first, fall back to MCP if API insufficient.

### 2. Model Switching: API vs Prompt Injection?

**Options:**
- **A. API** — True model switching (if available)
- **B. Prompt Injection** — Workaround, less clean

**Decision:** Use API if available, otherwise inject mode context into system prompt.

### 3. State Storage: Zed KV vs Filesystem?

**Options:**
- **A. Zed KV Store** — Native, ephemeral
- **B. Filesystem** — Persistent, survives Zed restarts
- **C. Project .kilo/ dir** — Version controlled

**Decision:** Use `.kilo/state.json` in project for persistence and version control.

### 4. Permission Enforcement: Hard vs Soft?

**Options:**
- **A. Hard** — Block disallowed file edits (requires API hooks)
- **B. Soft** — Document restrictions, rely on LLM

**Decision:** Start with soft (documentation), upgrade to hard if Zed API allows.

---

## 🛠 Build & Run Instructions

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown
```

### Build

```bash
cd RFQ_Buddy/zcode
cargo build --release --target wasm32-unknown-unknown
```

**Output:** `target/wasm32-unknown-unknown/release/zed_kilo_orchestrator.wasm`

### Install in Zed (Dev Mode)

1. Open Zed
2. Run: `zed: install dev extension` (or use menu)
3. Select: `RFQ_Buddy/zcode`
4. Zed will load the extension

### Debug

```bash
# Run Zed with extension logs
zed --foreground
```

---

## 📊 Progress Tracking

| Phase | Status | Completion |
|-------|--------|------------|
| **Phase 1** — Scaffolding | ✅ Complete | 100% |
| **Phase 2** — Integration | 🚧 In Progress | 0% |
| **Phase 3** — Advanced Features | ⏳ Not Started | 0% |

**Next Immediate Task:** Research Zed Extension API for slash command hooks.

---

## 🎓 Resources

- [Zed Extension Docs](https://zed.dev/docs/extensions)
- [zed_extension_api Crate](https://docs.rs/zed_extension_api)
- [Kilo Code Architecture](https://docs.kilocode.dev)
- [RFQ Buddy .kilocodemodes](../RFQ_Buddy/.kilocodemodes)

---

**Skills Applied:** `plan_before_code` + `architecture_respect`  
**Files Created:** 8 files (extension.toml, Cargo.toml, 5 Rust sources, README, .gitignore)  
**Next Agent:** Executor (Phase 2 implementation)  
**Approval Gate:** ✅ Ready for human review and decision on slash command approach
