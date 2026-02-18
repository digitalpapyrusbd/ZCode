# ZCode — Updated Implementation Plan

**Project:** Zed extension implementing Kilo Code-style mode orchestration  
**Status:** Phase 1 Complete | Phase 2 Enhanced (w/ CodeBuddy insights)  
**Date:** 2026-02-16  
**Updated:** Added learnings from CodeBuddy and Zed model analysis

---

## 📊 CodeBuddy Analysis — Key Findings

### What We Learned

1. **MCP Integration is Production-Ready**
   - CodeBuddy has dedicated `codebuddy mcp` command
   - MCP is viable for extending AI capabilities
   - **Action:** Prioritize MCP to Phase 2B (not Phase 3)

2. **Session Management is Critical**
   - CodeBuddy's `-c, --continue` for session resumption
   - Users expect conversation history
   - **Action:** Add session history tracking to Phase 2

3. **Configuration Management Matters**
   - CodeBuddy's `config set/get` commands
   - Users need control over settings
   - **Action:** Add `/config` commands to Phase 2

4. **CodeBuddy ≠ Kilo Code**
   - CodeBuddy is a **single AI assistant** (no modes)
   - Kilo Code is a **multi-agent orchestrator**
   - **Conclusion:** Our extension fills a unique niche

### What Zed Provides

**Zed supports 13+ AI providers:**
- Anthropic (Claude)
- OpenAI (GPT)
- Google AI (Gemini)
- DeepSeek
- Ollama (local models)
- xAI (Grok)
- Mistral
- Amazon Bedrock
- GitHub Copilot
- OpenRouter
- LM Studio
- Vercel v0
- Custom (OpenAI-compatible endpoints)

**Implication:** Our extension inherits **full model flexibility** from Zed. Users can:
- Mix local + cloud models
- Switch models per task
- Use any provider with their own API keys

**No need to build model selection** — Zed already has it!

---

## ✅ COMPLETED — Phase 1: Extension Scaffolding

### Files Created (12 files)

```
RFQ_Buddy/zcode/
├── extension.toml              # Zed manifest
├── Cargo.toml                  # Rust dependencies + WASM config
├── .gitignore                  # Build artifacts
├── README.md                   # User documentation
├── IMPLEMENTATION_PLAN.md      # This file (original)
├── IMPLEMENTATION_PLAN_V2.md   # This file (updated with CodeBuddy)
├── QUICK_REFERENCE.md          # Command reference
├── NEXT_STEPS.md               # Immediate action guide
├── PHASE_1_COMPLETION.md       # Phase 1 report
└── src/
    ├── lib.rs                  # Extension entry point (~100 LOC)
    ├── modes.rs                # Mode registry (~250 LOC)
    ├── orchestrator.rs         # Mode selection (~150 LOC)
    └── commands.rs             # Slash commands (~200 LOC)
```

### Core Features Implemented

- ✅ Mode type system matching `.kilocodemodes` schema
- ✅ YAML parsing with serde_yaml
- ✅ Mode registry with CRUD operations
- ✅ Keyword-based orchestration
- ✅ Command handlers for `/mode`, `/modes`, `/orchestrate`
- ✅ 13 unit tests
- ✅ Comprehensive documentation

**Total:** ~850 LOC Rust + ~400 LOC docs

---

## 🚧 UPDATED — Phase 2: Zed Integration (Enhanced)

**Goal:** Make extension functional in Zed with enhanced state management

**Estimated Time:** 5-7 days  
**Priority:** High

### 2.1 Slash Command Registration (Priority 1)

**Current Limitation:** Zed Extension API may not expose slash command registration.

**Action Items:**
- [ ] Research Zed Extension API v0.2.0 for command hooks
- [ ] If available: Implement native slash commands
- [ ] If not: Create MCP server fallback (see Phase 2B)

**Implementation (if API supports):**

```rust
// src/lib.rs
impl zed::Extension for KiloOrchestratorExtension {
    fn slash_commands(&self) -> Vec<zed::SlashCommand> {
        vec![
            zed::SlashCommand::new("modes", "List all modes"),
            zed::SlashCommand::new("mode", "Switch mode"),
            zed::SlashCommand::new("orchestrate", "Suggest mode"),
            zed::SlashCommand::new("history", "View conversation history"), // NEW
            zed::SlashCommand::new("config", "Manage settings"),            // NEW
        ]
    }

    fn handle_slash_command(
        &mut self,
        command: &str,
        args: &[&str],
        worktree: &zed::Worktree,
    ) -> Result<String> {
        match command {
            "modes" => Ok(commands::handle_modes_command(&self.mode_registry)),
            "mode" => {
                if args.is_empty() {
                    Err("Usage: /mode <slug>".into())
                } else {
                    let result = commands::handle_mode_command(&mut self.mode_registry, args[0]);
                    // Save state after mode switch
                    self.state.current_mode = self.mode_registry.current_mode().map(String::from);
                    let _ = self.state.save(&worktree.abs_path());
                    Ok(result)
                }
            }
            "orchestrate" => {
                let task = args.join(" ");
                Ok(commands::handle_orchestrate_command(&self.mode_registry, &task))
            }
            "history" => {
                let mode = args.get(0).map(|s| *s).or(self.state.current_mode.as_deref());
                Ok(commands::handle_history_command(&self.state, mode))
            }
            "config" => {
                if args.len() < 2 {
                    Err("Usage: /config [get|set|reset] <key> [value]".into())
                } else {
                    Ok(commands::handle_config_command(
                        &mut self.state.config,
                        args[0],
                        args[1],
                        args.get(2).copied(),
                    ))
                }
            }
            _ => Err(format!("Unknown command: {}", command).into()),
        }
    }
}
```

### 2.2 Enhanced State Persistence (Priority 2) — **NEW**

**Inspired by CodeBuddy's session management**

**Goal:** Remember current mode, sticky models, and conversation history across sessions.

**Action Items:**
- [ ] Create `src/state.rs` module
- [ ] Implement enhanced `ExtensionState` with session history
- [ ] Add `ConfigOverrides` for user settings
- [ ] Save to `.kilo/state.json` on every mode switch
- [ ] Load state on extension init

**Implementation:**

```rust
// src/state.rs (NEW FILE)
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionState {
    pub current_mode: Option<String>,
    pub sticky_models: HashMap<String, String>, // mode_slug -> model_name
    
    // NEW: Session history per mode
    pub mode_sessions: HashMap<String, Vec<Message>>,
    
    // NEW: Config overrides
    pub config: ConfigOverrides,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: String,      // "user" or "assistant"
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ConfigOverrides {
    pub max_history_per_mode: usize,  // default: 50
    pub auto_save_state: bool,         // default: true
    pub show_mode_indicator: bool,     // default: true
    pub mcp_enabled: bool,             // default: false
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

    pub fn add_message(&mut self, mode: &str, role: &str, content: &str) {
        let messages = self.mode_sessions
            .entry(mode.to_string())
            .or_insert_with(Vec::new);
        
        messages.push(Message {
            role: role.to_string(),
            content: content.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
        });
        
        // Keep only last N messages
        if messages.len() > self.config.max_history_per_mode {
            messages.drain(0..1);
        }
    }

    pub fn get_history(&self, mode: &str) -> Option<&Vec<Message>> {
        self.mode_sessions.get(mode)
    }

    pub fn clear_history(&mut self, mode: &str) {
        self.mode_sessions.remove(mode);
    }
}

impl Default for ExtensionState {
    fn default() -> Self {
        Self {
            current_mode: None,
            sticky_models: HashMap::new(),
            mode_sessions: HashMap::new(),
            config: ConfigOverrides::default(),
        }
    }
}
```

**Update `Cargo.toml`:**

```toml
[dependencies]
zed_extension_api = "0.2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde_yaml = "0.9"
toml = "0.8"
```

### 2.3 Configuration Commands (Priority 3) — **NEW**

**Inspired by CodeBuddy's `config` subcommand**

**Goal:** Allow users to configure extension behavior.

**Commands:**
- `/config get <key>` — View configuration value
- `/config set <key> <value>` — Update configuration
- `/config reset` — Reset to defaults

**Implementation:**

```rust
// src/commands.rs (ADD THIS)
pub fn handle_config_command(
    config: &mut ConfigOverrides,
    action: &str,
    key: &str,
    value: Option<&str>,
) -> String {
    match action {
        "get" => {
            match key {
                "max_history_per_mode" => format!("{}", config.max_history_per_mode),
                "auto_save_state" => format!("{}", config.auto_save_state),
                "show_mode_indicator" => format!("{}", config.show_mode_indicator),
                "mcp_enabled" => format!("{}", config.mcp_enabled),
                _ => format!("❌ Unknown config key: {}", key),
            }
        }
        "set" => {
            if value.is_none() {
                return "❌ Usage: /config set <key> <value>".to_string();
            }
            let val = value.unwrap();
            match key {
                "max_history_per_mode" => {
                    if let Ok(n) = val.parse::<usize>() {
                        config.max_history_per_mode = n;
                        format!("✅ Set max_history_per_mode = {}", n)
                    } else {
                        "❌ Value must be a number".to_string()
                    }
                }
                "auto_save_state" => {
                    if let Ok(b) = val.parse::<bool>() {
                        config.auto_save_state = b;
                        format!("✅ Set auto_save_state = {}", b)
                    } else {
                        "❌ Value must be true/false".to_string()
                    }
                }
                "show_mode_indicator" => {
                    if let Ok(b) = val.parse::<bool>() {
                        config.show_mode_indicator = b;
                        format!("✅ Set show_mode_indicator = {}", b)
                    } else {
                        "❌ Value must be true/false".to_string()
                    }
                }
                "mcp_enabled" => {
                    if let Ok(b) = val.parse::<bool>() {
                        config.mcp_enabled = b;
                        format!("✅ Set mcp_enabled = {}", b)
                    } else {
                        "❌ Value must be true/false".to_string()
                    }
                }
                _ => format!("❌ Unknown config key: {}", key),
            }
        }
        "reset" => {
            *config = ConfigOverrides::default();
            "✅ Configuration reset to defaults".to_string()
        }
        _ => "❌ Usage: /config [get|set|reset] <key> [value]".to_string(),
    }
}

pub fn handle_history_command(state: &ExtensionState, mode: Option<&str>) -> String {
    let mode_slug = mode.or(state.current_mode.as_deref());
    
    if mode_slug.is_none() {
        return "❌ No mode specified and no current mode active".to_string();
    }
    
    let mode_slug = mode_slug.unwrap();
    
    if let Some(messages) = state.get_history(mode_slug) {
        if messages.is_empty() {
            format!("📭 No conversation history for mode: {}", mode_slug)
        } else {
            let mut output = format!("# Conversation History — {}\n\n", mode_slug);
            output.push_str(&format!("{} messages (last {} shown)\n\n", 
                messages.len(), 
                messages.len().min(10)));
            
            // Show last 10 messages
            for msg in messages.iter().rev().take(10).rev() {
                let timestamp = chrono::DateTime::from_timestamp(msg.timestamp, 0)
                    .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                
                output.push_str(&format!("**{}** ({})\n", msg.role, timestamp));
                output.push_str(&format!("{}\n\n", msg.content));
            }
            
            output
        }
    } else {
        format!("📭 No conversation history for mode: {}", mode_slug)
    }
}
```

**Note:** Add `chrono = "0.4"` to `Cargo.toml` for timestamp formatting.

### 2.4 Mode Context Injection (Priority 4)

**Goal:** Ensure AI uses mode's role definition and custom instructions.

**Challenge:** Zed may not expose prompt pipeline hooks.

**Options:**
- **A. Hook into Zed's prompt pipeline** (if API available)
- **B. Prepend mode context to user messages** (fallback)
- **C. Use system message injection** (if API supports)

**Action Items:**
- [ ] Research Zed Extension API for prompt hooks
- [ ] Implement context injection via available method
- [ ] Test mode instructions appear in AI responses

**Implementation (fallback - prepend to user messages):**

```rust
// src/lib.rs
impl zed::Extension for KiloOrchestratorExtension {
    fn before_message_send(
        &self,
        message: &str,
    ) -> Result<String> {
        if let Some(mode_slug) = &self.state.current_mode {
            if let Some(mode) = self.mode_registry.get_mode(mode_slug) {
                let context = format!(
                    "# Mode: {} ({})\n{}\n\n{}\n\n---\n\nUser message:\n{}",
                    mode.name,
                    mode.slug,
                    mode.role_definition,
                    mode.custom_instructions.as_deref().unwrap_or(""),
                    message
                );
                return Ok(context);
            }
        }
        Ok(message.to_string())
    }
}
```

**Note:** `before_message_send` is hypothetical - actual Zed API may differ.

---

## 🎯 NEW — Phase 2B: MCP Integration (Prioritized)

**Goal:** Use MCP for advanced orchestration and tool extension

**Estimated Time:** 3-5 days  
**Priority:** High (moved up from Phase 3)

**Rationale:** CodeBuddy's MCP support validates this approach as production-ready.

### 2B.1 Create MCP Server

**Purpose:** LLM-based orchestration and additional tools.

**Tools to Expose:**
- `kilo_orchestrate_task` — Intelligently select mode for task
- `kilo_analyze_codebase` — Understand project structure
- `kilo_suggest_skills` — Map task → skills from `/skills/`

**Implementation (Python example):**

```python
# mcp_server/kilo_orchestrator_mcp.py
from mcp.server import Server
from mcp.types import Tool
import yaml
import json
import os

server = Server("kilo-orchestrator")

# Load modes from .kilocodemodes
def load_modes():
    if os.path.exists(".kilocodemodes"):
        with open(".kilocodemodes") as f:
            config = yaml.safe_load(f)
            return {m['slug']: m for m in config['customModes']}
    return {}

modes = load_modes()

@server.tool()
def kilo_orchestrate_task(task: str, context: str = "") -> dict:
    """
    Use LLM to intelligently select the best mode for a task.
    
    Args:
        task: The task description
        context: Optional project context
    
    Returns:
        {
            "suggested_mode": "mode-slug",
            "reasoning": "Explanation",
            "confidence": 0.0-1.0
        }
    """
    # Call LLM (e.g., via OpenAI API) with prompt:
    prompt = f"""
You are a mode orchestrator. Given the task and available modes, select the best mode.

# Available Modes:
{chr(10).join(f"- **{m['slug']}**: {m['roleDefinition']}" for m in modes.values())}

# Task:
{task}

# Context:
{context}

# Response (JSON):
{{
  "suggested_mode": "mode-slug",
  "reasoning": "Brief explanation",
  "confidence": 0.95
}}
"""
    
    # TODO: Call LLM API and parse response
    # For now, return mock
    return {
        "suggested_mode": "frontend-specialist",
        "reasoning": "Task involves UI components",
        "confidence": 0.85
    }

@server.tool()
def kilo_analyze_codebase(path: str = ".") -> dict:
    """
    Analyze project structure and suggest relevant modes.
    
    Returns:
        {
            "languages": ["TypeScript", "Rust"],
            "frameworks": ["SvelteKit", "Express"],
            "suggested_modes": ["frontend-specialist", "test-engineer"]
        }
    """
    # TODO: Implement codebase analysis
    return {
        "languages": ["TypeScript", "Rust"],
        "frameworks": ["SvelteKit"],
        "suggested_modes": ["frontend-specialist"]
    }

if __name__ == "__main__":
    server.run()
```

**Run:**
```bash
cd mcp_server
python kilo_orchestrator_mcp.py
```

### 2B.2 Integrate MCP with Extension

**Goal:** Extension calls MCP server for advanced orchestration.

**Action Items:**
- [ ] Add MCP client to extension (or use Zed's MCP support)
- [ ] Call `kilo_orchestrate_task` from `/orchestrate` command
- [ ] Show MCP-powered suggestions in UI

**Implementation:**

```rust
// src/orchestrator.rs (UPDATED)
pub struct Orchestrator<'a> {
    registry: &'a ModeRegistry,
    use_mcp: bool,
}

impl<'a> Orchestrator<'a> {
    pub fn new(registry: &'a ModeRegistry, use_mcp: bool) -> Self {
        Self { registry, use_mcp }
    }

    pub fn suggest_mode(&self, task_description: &str) -> Option<&Mode> {
        if self.use_mcp {
            // Call MCP server for LLM-based orchestration
            self.suggest_mode_via_mcp(task_description)
        } else {
            // Fall back to keyword-based orchestration
            self.suggest_mode_via_keywords(task_description)
        }
    }

    fn suggest_mode_via_mcp(&self, task: &str) -> Option<&Mode> {
        // TODO: Call MCP server
        // For now, fall back to keywords
        self.suggest_mode_via_keywords(task)
    }

    fn suggest_mode_via_keywords(&self, task: &str) -> Option<&Mode> {
        // Existing keyword matching logic
        let task_lower = task.to_lowercase();
        let mode_keywords = [
            ("frontend-specialist", vec!["ui", "frontend", "react", "component"]),
            ("test-engineer", vec!["test", "testing", "qa"]),
            // ... rest of keywords
        ];

        let mut best_match: Option<(&str, usize)> = None;
        for (mode_slug, keywords) in &mode_keywords {
            let match_count = keywords
                .iter()
                .filter(|kw| task_lower.contains(*kw))
                .count();

            if match_count > 0 {
                if let Some((_, current_best)) = best_match {
                    if match_count > current_best {
                        best_match = Some((mode_slug, match_count));
                    }
                } else {
                    best_match = Some((mode_slug, match_count));
                }
            }
        }

        best_match.and_then(|(slug, _)| self.registry.get_mode(slug))
    }
}
```

---

## 🚀 Phase 3: Advanced Features (Future)

**Goal:** Polish and extend functionality

**Estimated Time:** 2-4 weeks  
**Priority:** Medium

### 3.1 UI Indicators

- Status bar showing current mode
- Mode picker UI
- Color-coded mode types

### 3.2 Permission Enforcement (Hard Blocks)

- Hook into Zed's file editing pipeline
- Block edits outside mode's `fileRegex`
- Show permission denied errors

### 3.3 Mode Marketplace

- Share/import modes from GitHub
- `zed: import mode <url>` command
- Community mode repository

### 3.4 Hierarchical Modes

- Modes can delegate to sub-modes
- `canDelegate` flag in mode definition
- Orchestrator handles delegation chains

### 3.5 Context Preservation

- Maintain conversation history across mode switches
- Context summarization for large histories
- Smart context truncation

---

## 📊 Updated Progress Tracking

| Phase | Status | Completion | Estimated Time |
|-------|--------|------------|----------------|
| **Phase 1** — Scaffolding | ✅ Complete | 100% | 2 hours |
| **Phase 2** — Integration (Enhanced) | 🚧 In Progress | 0% | 5-7 days |
| **Phase 2B** — MCP Integration | ⏳ Not Started | 0% | 3-5 days |
| **Phase 3** — Advanced Features | ⏳ Not Started | 0% | 2-4 weeks |

**Total Estimated Time Remaining:** 8-12 days for Phases 2-2B, 2-4 weeks for Phase 3

---

## 🎓 Learnings from CodeBuddy

### What We Adopted

1. ✅ **Session history tracking** — Store conversation per mode
2. ✅ **Configuration management** — `/config` commands
3. ✅ **MCP prioritization** — Moved to Phase 2B
4. ✅ **State persistence patterns** — `.kilo/state.json`

### What We Did NOT Adopt

1. ❌ **Cloud dependencies** — We stay local-first
2. ❌ **Single AI model** — We keep multi-persona orchestration
3. ❌ **CLI architecture** — We're Zed-native

### Competitive Advantages

| Feature | CodeBuddy | Our Extension |
|---------|-----------|---------------|
| Multi-persona | ❌ | ✅ **UNIQUE** |
| Permission control | ❌ | ✅ **UNIQUE** |
| Model flexibility | ⚠️ Limited | ✅ 13+ providers (via Zed) |
| Local models | ❌ | ✅ Ollama, LM Studio |
| Session history | ✅ | ✅ (Phase 2) |
| MCP support | ✅ | ✅ (Phase 2B) |
| Configuration | ✅ | ✅ (Phase 2) |

---

## 🛠 Build & Test Instructions

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

### Install in Zed

1. Open Zed
2. Run: `zed: install dev extension` (Cmd/Ctrl+Shift+P)
3. Select: `RFQ_Buddy/zcode`
4. Zed will load the extension

### Debug

```bash
# Run Zed with extension logs
zed --foreground
```

---

## 📝 Next Immediate Actions

1. **Research Zed Extension API** (30 min)
   - Check for slash command hooks
   - Check for prompt pipeline hooks
   - Check for filesystem access APIs

2. **Implement Enhanced State** (2-3 hours)
   - Create `src/state.rs`
   - Add session history tracking
   - Add configuration management

3. **Add Configuration Commands** (1-2 hours)
   - Implement `/config get/set/reset`
   - Implement `/history [mode]`
   - Update command registry

4. **Build and Test** (1 hour)
   - Build WASM
   - Install in Zed
   - Test with RFQ_Buddy's 6 modes
   - Verify state persistence

5. **Create MCP Server** (4-6 hours, Phase 2B)
   - Set up Python MCP server
   - Implement `kilo_orchestrate_task` tool
   - Test MCP integration with Zed

---

## 📚 Resources

- [Zed Extension Docs](https://zed.dev/docs/extensions)
- [Zed AI Docs](https://zed.dev/docs/ai/overview)
- [zed_extension_api Crate](https://docs.rs/zed_extension_api)
- [CodeBuddy Analysis](../plans/reports/CODEBUDDY_ANALYSIS.md)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [RFQ Buddy .kilocodemodes](../.kilocodemodes)

---

**Skills Applied:** `plan_before_code` + `architecture_respect`  
**Last Updated:** 2026-02-16 (added CodeBuddy insights, enhanced Phase 2, prioritized MCP)  
**Next Agent:** Executor (Phase 2 enhanced implementation)  
**Approval Gate:** ✅ Ready for human review and Phase 2 execution
