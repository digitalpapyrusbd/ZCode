# ZCode — Intelligent Profile Orchestration for Zed

A Zed extension that provides intelligent profile orchestration and workflow coordination via a bundled MCP server.

## What It Does

**ZCode solves the "lost context" problem when switching between Zed profiles.**

When you switch from Architect to Code profile in Zed, you start a new conversation and lose all context. ZCode provides a shared memory (MCP server) that persists across profile switches, so each profile knows what the others did.

## Architecture

```
ZCode Extension (one install)
├── Extension (Rust/WASM)
│   └── Tells Zed how to start the MCP server
│
└── MCP Server (JavaScript, zero dependencies)
    ├── analyze_task      → "Which profile should I use?"
    ├── switch_profile    → "Please switch to X" (user instruction)
    ├── get_workflow_state → Shared memory between profiles
    ├── update_workflow_state → Persist tasks & progress
    ├── add_session_entry → Record what each profile did
    ├── list_profiles     → Show available profiles
    ├── get_profile_info  → Profile details
    └── clear_workflow_state → Start fresh
```

## Installation

### As Dev Extension (for development)

1. Clone this repository
2. In Zed: **Extensions** → **Install Dev Extension** → select the `zcode-extension/` directory
3. Copy profiles from `profiles/all_profiles.json` into your Zed `settings.json`

### From Marketplace (coming soon)

1. Open Zed → **Extensions** → Search "ZCode" → **Install**

## Setup Profiles

Copy the profiles from [`profiles/all_profiles.json`](profiles/all_profiles.json) into your Zed `settings.json` under the `assistant.profiles` key.

## Available Profiles

| Profile | Skills | Best For |
|---------|--------|----------|
| **Architect** | plan_before_code | Planning, design, architecture |
| **Code** | surgical_execution + architecture_respect | Implementation, bug fixes |
| **Debug** | root_cause_debugging + surgical_execution | Systematic debugging |
| **Ask** | none | Questions, explanations |
| **Orchestrator** | plan_before_code | Multi-profile workflow coordination |
| **Review** | architecture_respect | Code review |
| **Frontend Specialist** | architecture_respect + surgical_execution | UI/UX, SvelteKit |
| **Test Engineer** | plan_before_code | Test writing |
| **Documentation** | none | Docs, READMEs, guides |
| **Code Skeptic** | architecture_respect | Quality inspection |
| **Code Simplifier** | surgical_execution | Refactoring |
| **Code Reviewer** | architecture_respect + surgical_execution | PR review |

## Orchestrated Workflow Example

```
1. User: "Build a login page with OAuth"

2. [Any Profile] → calls analyze_task("Build login page with OAuth")
   ← "Use Architect first"

3. [Architect] → plans the work, calls update_workflow_state with todo list
   ← "Switch to Code when ready"

4. User switches to Code profile (manual)

5. [Code] → calls get_workflow_state, sees Architect's plan
   → implements the feature, calls add_session_entry
   ← "Switch to Test Engineer"

6. User switches to Test Engineer

7. [Test Engineer] → calls get_workflow_state, sees what Code built
   → writes tests, verifies functionality
```

## State Persistence

Workflow state is stored at `~/.zcode/state.json`. This file persists across Zed restarts and profile switches.

## Requirements

- Zed editor (with extensions support)
- Node.js (Zed bundles its own — no separate install needed)

## License

MIT
