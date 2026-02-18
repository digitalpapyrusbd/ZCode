# Quick Start — Next Steps for Zed Kilo Orchestrator

**Current Status:** ✅ Phase 1 Complete — Ready for Phase 2  
**Your Next Action:** Choose a path below

---

## Option 1: Continue to Phase 2 (Recommended)

**Goal:** Make the extension functional in Zed

### Immediate Tasks (Priority Order)

#### 1. Research Zed Extension API (30 minutes)

```bash
# Read the latest Zed extension docs
# Focus on:
# - Slash command registration
# - Extension lifecycle hooks
# - Prompt pipeline access
# - Key-value store or filesystem APIs
```

**Key Question:** Does `zed_extension_api` v0.2.0 support slash commands?

**If YES → Proceed to Task 2**  
**If NO → See "Option 2: MCP Server Alternative" below**

#### 2. Build and Test Extension (1 hour)

```bash
# 1. Ensure Rust + WASM target installed
rustup target add wasm32-unknown-unknown

# 2. Build extension
cd RFQ_Buddy/zcode
cargo build --release --target wasm32-unknown-unknown

# 3. Check for build errors
# If errors: install missing dependencies or fix syntax

# 4. Install in Zed
# Open Zed, run: zed: install dev extension
# Select: RFQ_Buddy/zcode

# 5. Test loading
# Check Zed logs for "Loaded X custom modes"
zed --foreground
```

**Expected Output:**
```
✅ Loaded 6 custom modes from .kilocodemodes
```

#### 3. Implement Slash Command Registration (2-4 hours)

Edit `src/lib.rs` to register commands:

```rust
// Add this method to KiloOrchestratorExtension
fn slash_commands(&self) -> Vec<zed::SlashCommand> {
    vec![
        zed::SlashCommand::new("modes", "List all available modes"),
        zed::SlashCommand::new("mode", "Switch to a specific mode"),
        zed::SlashCommand::new("orchestrate", "Suggest best mode for task"),
    ]
}

// Add command handler
fn handle_slash_command(
    &mut self,
    command: &str,
    args: &[&str],
) -> Result<String> {
    match command {
        "modes" => Ok(commands::handle_modes_command(&self.mode_registry)),
        "mode" => {
            if args.is_empty() {
                Err("Usage: /mode <slug>".into())
            } else {
                Ok(commands::handle_mode_command(&mut self.mode_registry, args[0]))
            }
        }
        "orchestrate" => {
            let task = args.join(" ");
            Ok(commands::handle_orchestrate_command(&self.mode_registry, &task))
        }
        _ => Err(format!("Unknown command: {}", command).into()),
    }
}
```

**Test:**
- Rebuild extension
- Reload Zed
- Type `/modes` in assistant
- Verify command appears and works

#### 4. Add State Persistence (2-3 hours)

Create `src/state.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionState {
    pub current_mode: Option<String>,
    pub sticky_models: HashMap<String, String>, // mode_slug -> model_name
}

impl ExtensionState {
    pub fn load(project_path: &Path) -> Self {
        let state_path = project_path.join(".kilo/state.json");
        if state_path.exists() {
            if let Ok(content) = fs::read_to_string(&state_path) {
                if let Ok(state) = serde_json::from_str(&content) {
                    return state;
                }
            }
        }
        Self::default()
    }

    pub fn save(&self, project_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let kilo_dir = project_path.join(".kilo");
        fs::create_dir_all(&kilo_dir)?;
        
        let state_path = kilo_dir.join("state.json");
        let content = serde_json::to_string_pretty(self)?;
        fs::write(&state_path, content)?;
        
        Ok(())
    }
}

impl Default for ExtensionState {
    fn default() -> Self {
        Self {
            current_mode: None,
            sticky_models: HashMap::new(),
        }
    }
}
```

Update `lib.rs`:

```rust
mod state;
use state::ExtensionState;

struct KiloOrchestratorExtension {
    mode_registry: ModeRegistry,
    state: ExtensionState, // ADD THIS
}

impl zed::Extension for KiloOrchestratorExtension {
    fn new() -> Self {
        Self {
            mode_registry: ModeRegistry::new(),
            state: ExtensionState::default(), // ADD THIS
        }
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // Load state
        let project_path = worktree.abs_path();
        self.state = ExtensionState::load(&project_path);
        
        // Load modes
        if let Some(modes_content) = worktree.read_text_file(".kilocodemodes") {
            match self.mode_registry.load_from_yaml(&modes_content) {
                Ok(count) => {
                    eprintln!("✅ Loaded {} custom modes", count);
                    
                    // Restore current mode if saved
                    if let Some(mode_slug) = &self.state.current_mode {
                        let _ = self.mode_registry.switch_mode(mode_slug);
                        eprintln!("✅ Restored mode: {}", mode_slug);
                    }
                }
                Err(e) => eprintln!("⚠️ Failed to load modes: {}", e),
            }
        }

        Err("No language server".into())
    }
}
```

**Test:**
- Switch to a mode: `/mode test-engineer`
- Restart Zed
- Verify mode is still active

---

## Option 2: MCP Server Alternative

**If Zed Extension API doesn't support slash commands:**

### Create MCP Server (Python Example)

```python
# mcp_server.py
from mcp.server import Server
from mcp.types import Tool
import yaml
import json

server = Server("kilo-orchestrator")

# Load modes from .kilocodemodes
with open(".kilocodemodes") as f:
    config = yaml.safe_load(f)
    modes = {m['slug']: m for m in config['customModes']}

@server.tool()
def list_modes() -> str:
    """List all available modes"""
    output = []
    for mode in modes.values():
        output.append(f"**{mode['name']}** ({mode['slug']})\n{mode['roleDefinition']}")
    return "\n\n".join(output)

@server.tool()
def switch_mode(slug: str) -> str:
    """Switch to a specific mode"""
    if slug not in modes:
        return f"❌ Mode '{slug}' not found"
    
    mode = modes[slug]
    # Save state
    with open(".kilo/state.json", "w") as f:
        json.dump({"current_mode": slug}, f)
    
    return f"✅ Switched to {mode['name']}\n\n{mode['roleDefinition']}\n\n{mode.get('customInstructions', '')}"

@server.tool()
def orchestrate_task(task: str) -> str:
    """Suggest best mode for a task"""
    # Use keyword matching or call LLM
    keywords = {
        "frontend-specialist": ["ui", "frontend", "react", "component"],
        "test-engineer": ["test", "testing", "qa", "unit"],
        "docs-specialist": ["docs", "documentation", "readme"],
    }
    
    task_lower = task.lower()
    best_match = None
    best_score = 0
    
    for slug, words in keywords.items():
        score = sum(1 for w in words if w in task_lower)
        if score > best_score:
            best_score = score
            best_match = slug
    
    if best_match:
        mode = modes[best_match]
        return f"🎯 Suggested: **{mode['name']}**\n\n{mode['roleDefinition']}\n\nUse: `/switch_mode {best_match}`"
    
    return "🤔 No specific mode matched. Use `/list_modes` to see options."

if __name__ == "__main__":
    server.run()
```

**Run:**
```bash
python mcp_server.py
```

**Use in Zed:**
- Configure MCP server in Zed settings
- Use tools via Zed's MCP integration

---

## Option 3: Publish as Open Source

**Share with Zed community:**

1. **Clean up repo:**
   ```bash
   cargo fmt
   cargo clippy -- -D warnings
   cargo test
   ```

2. **Create GitHub repo:**
   ```bash
   cd zcode
   git init
   git add .
   git commit -m "Initial release: ZCode for Zed"
   gh repo create zcode --public --source=.
   git push origin main
   ```

3. **Submit to Zed Extensions:**
   - Fork `zed-industries/extensions`
   - Add `extensions/kilo-orchestrator/extension.toml`
   - Submit PR
   - Reference: https://zed.dev/docs/extensions/publishing

---

## Decision Matrix

| Factor | Option 1: Continue Phase 2 | Option 2: MCP Server | Option 3: Publish |
|--------|---------------------------|---------------------|------------------|
| **Effort** | 1-2 days | 4-6 hours | 2-3 hours |
| **Integration** | Tight (native extension) | Loose (external server) | N/A |
| **Flexibility** | Limited by Zed API | Full control | N/A |
| **Maintenance** | Lower (single codebase) | Higher (two components) | Community-driven |
| **Best For** | Production use in RFQ Buddy | Quick prototyping | Community adoption |

**Recommendation:** Option 1 (Phase 2) for production use, Option 2 as fallback if API lacks features.

---

## Questions to Answer First

Before proceeding, research:

1. ✅ Does `zed_extension_api` v0.2.0 support slash command registration?
2. ✅ Can extensions hook into the prompt pipeline?
3. ✅ Does Zed provide filesystem access for extensions?
4. ✅ Can extensions add UI elements (status bar, mode indicator)?
5. ⚠️ Is there a Zed community Discord/forum for extension dev questions?

**Resources:**
- Zed Extension Docs: https://zed.dev/docs/extensions
- Zed Discord: https://discord.gg/zed (check for extension-dev channel)
- Example extensions: https://github.com/zed-industries/extensions

---

## Ready to Proceed?

**If YES:**
1. Choose Option 1, 2, or 3 above
2. Follow the step-by-step instructions
3. Refer to `IMPLEMENTATION_PLAN.md` for detailed guidance

**If NEED MORE INFO:**
1. Read `zcode/README.md`
2. Read `zcode/IMPLEMENTATION_PLAN.md`
3. Read `plans/reports/ZED_EXTENSION_DEVELOPMENT.md`

**If WANT TO DELEGATE:**
- Handoff to Executor agent with: "Implement Phase 2 slash command registration"
- Provide: `IMPLEMENTATION_PLAN.md` Phase 2 section as reference
- Skills required: `surgical_execution` + `architecture_respect`

---

**Last Updated:** 2026-02-16  
**Status:** Ready for Phase 2 execution
