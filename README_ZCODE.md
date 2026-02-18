# ZCode - AI Mode Orchestrator for Zed

**Multi-mode AI orchestration for Zed Editor**

Switch between specialized AI personas with distinct roles, permissions, and behaviors. Each mode can have file-level access control and custom instructions.

---

## 🎯 What is ZCode?

ZCode brings **Kilo Code-style mode orchestration** to Zed Editor. Define multiple AI "personas" (modes) with:

- **Distinct roles** (frontend specialist, test engineer, code reviewer, etc.)
- **Permission control** (which files each mode can edit)
- **Custom instructions** (specialized behavior per mode)
- **Smart orchestration** (automatically suggest best mode for tasks)
- **Model flexibility** (use any AI provider Zed supports)

### Why ZCode?

**Without ZCode:**
- ❌ Single AI personality for everything
- ❌ No guardrails on what AI can modify
- ❌ Generic responses regardless of task

**With ZCode:**
- ✅ Specialized AI personas for different tasks
- ✅ File-level permission enforcement
- ✅ Context-aware, role-specific responses
- ✅ Intelligent mode selection

---

## 🚀 Quick Start

### Installation

1. **Ensure Rust is installed:**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

2. **Clone ZCode:**
   ```bash
   cd ~/projects  # or your preferred location
   git clone https://github.com/yourusername/zcode
   cd zcode
   ```

3. **Build the extension:**
   ```bash
   cargo build --release --target wasm32-unknown-unknown
   ```

4. **Install in Zed:**
   - Open Zed
   - Run: `zed: install dev extension` (Cmd/Ctrl+Shift+P)
   - Select the `zcode` directory

### Configuration

Create a `.kilocodemodes` file in your project root:

```yaml
customModes:
  - slug: frontend-dev
    name: Frontend Developer
    roleDefinition: |
      You are a frontend expert specializing in React, TypeScript, and modern CSS.
    groups:
      - read
      - browser
      - - edit
        - fileRegex: \.(tsx?|jsx?|css|scss)$
          description: Frontend files only
    customInstructions: |
      Focus on:
      - Accessibility (WCAG AA)
      - Responsive design
      - Performance optimization
    source: project

  - slug: test-engineer
    name: Test Engineer
    roleDefinition: |
      You are a QA specialist focused on comprehensive testing.
    groups:
      - read
      - command
      - - edit
        - fileRegex: \.(test|spec)\.(ts|js)$
          description: Test files only
    customInstructions: |
      Write clear, maintainable tests with good coverage.
    source: project
```

### Usage

In Zed's assistant panel:

```
/modes                                # List all available modes
/mode frontend-dev                    # Switch to Frontend Developer mode
/orchestrate Add responsive navigation # Let ZCode suggest best mode
```

---

## ✨ Features

### 🤖 Multiple AI Personas

Define unlimited modes with specialized expertise:
- Frontend specialists (React, Vue, Svelte)
- Backend experts (APIs, databases, architecture)
- Test engineers (unit, integration, e2e)
- DevOps specialists (CI/CD, deployment)
- Code reviewers (quality, security)
- Documentation writers (clear, comprehensive docs)

### 🔒 Permission Control

Restrict what each mode can access:

```yaml
groups:
  - read                    # Can read any file
  - browser                 # Can browse web
  - command                 # Can run shell commands
  - - edit                  # Can edit files matching regex
    - fileRegex: \.(ts|js)$
```

**Example:** Frontend mode can ONLY edit `.ts/.js/.css` files - cannot touch backend code.

### 🎯 Smart Orchestration

ZCode analyzes your task and suggests the best mode:

```
/orchestrate Write unit tests for auth service
→ Suggests: Test Engineer mode
→ Reasoning: Task involves testing, requires test file access
```

Uses keyword matching (fast) or LLM-based routing (intelligent).

### 🧠 Model Flexibility

ZCode works with **ALL models Zed supports:**
- Anthropic (Claude Sonnet, Opus)
- OpenAI (GPT-4, GPT-5, o1)
- Google AI (Gemini)
- DeepSeek, xAI (Grok), Mistral
- Ollama (local models - Llama, Qwen, etc.)
- OpenRouter (100+ models)
- GitHub Copilot
- Custom endpoints

**No lock-in** - use your own API keys or local models.

### 💾 Session Persistence

- Current mode saved across Zed restarts
- Conversation history per mode
- Configuration preserved
- Sticky model preferences

### ⚙️ Configuration Management

```
/config get max_history_per_mode    # View settings
/config set max_history_per_mode 100 # Update settings
/config reset                        # Reset to defaults
```

---

## 📖 Documentation

- **[Quick Reference](QUICK_REFERENCE.md)** — Command syntax and troubleshooting
- **[Implementation Plan](IMPLEMENTATION_PLAN_V2.md)** — Architecture and roadmap
- **[Examples](examples/)** — Sample mode configurations

---

## 🔧 Advanced Usage

### Custom Mode Definition

```yaml
customModes:
  - slug: security-auditor
    name: Security Auditor
    roleDefinition: |
      You are a security expert focused on finding vulnerabilities.
    groups:
      - read
      - - edit
        - fileRegex: security-audit\.md$
          description: Can only write to audit report
    customInstructions: |
      Analyze for:
      - SQL injection risks
      - XSS vulnerabilities
      - Authentication flaws
      - Sensitive data exposure
      
      Format findings as:
      - **Severity**: Critical/High/Medium/Low
      - **Location**: File and line number
      - **Issue**: Description
      - **Recommendation**: How to fix
    source: project
```

### Mode Orchestration (MCP)

For intelligent mode selection, ZCode can use MCP servers:

```yaml
config:
  mcp_enabled: true
```

See [MCP Integration Guide](docs/mcp-integration.md) for setup.

### Hierarchical Modes

Modes can delegate to sub-modes (future feature):

```yaml
- slug: orchestrator
  name: Orchestrator
  canDelegate: true
  delegateTo: [frontend-dev, test-engineer, devops]
```

---

## 🏗 Architecture

```
User → Zed → ZCode Extension → ModeRegistry → .kilocodemodes
                    ↓
              Orchestrator → Suggest mode
                    ↓
              Commands → /mode, /modes, /orchestrate
                    ↓
          Mode context → Injected into AI prompts
```

**Tech Stack:**
- Rust + WASM (extension)
- Zed Extension API
- YAML (configuration)
- Optional: MCP (advanced orchestration)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

**Areas needing help:**
- Additional mode examples
- UI improvements (status bar indicator)
- Permission enforcement (hard blocks)
- MCP server implementation
- Documentation

---

## 📊 Project Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1 — Scaffolding | ✅ Complete | 100% |
| Phase 2 — Zed Integration | 🚧 In Progress | 20% |
| Phase 2B — MCP Support | ⏳ Planned | 0% |
| Phase 3 — Advanced Features | ⏳ Planned | 0% |

See [IMPLEMENTATION_PLAN_V2.md](IMPLEMENTATION_PLAN_V2.md) for details.

---

## 🆚 Comparison

| Feature | Standard Zed AI | ZCode |
|---------|----------------|-------|
| AI Personas | Single | ✅ Multiple |
| Permission Control | None | ✅ File-level |
| Smart Orchestration | Manual | ✅ Automatic |
| Role-Specific Behavior | No | ✅ Yes |
| Model Support | 13+ providers | ✅ Same (inherits) |

---

## 📝 Examples

See `examples/` directory:
- **[rfq-buddy-modes.yaml](examples/rfq-buddy-modes.yaml)** — Full-featured setup with 6 specialized modes
- **[simple-modes.yaml](examples/simple-modes.yaml)** — Minimal starter configuration
- **[enterprise-modes.yaml](examples/enterprise-modes.yaml)** — Corporate development workflow

---

## 🔗 Links

- **Zed Editor:** [zed.dev](https://zed.dev)
- **Kilo Code:** [Kilo Code Docs](https://docs.kilocode.dev) (inspiration)
- **MCP Protocol:** [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/zcode/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/zcode/discussions)

---

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by [Kilo Code](https://kilocode.dev)'s mode orchestration
- Built for the [Zed](https://zed.dev) editor community
- Special thanks to RFQ Buddy project for being the first real-world test case

---

**Made with ❤️ for the Zed community**
