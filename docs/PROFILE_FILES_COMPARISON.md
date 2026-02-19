# Profile Files Comparison

## Overview

The ZCode project has two profile definition files:

1. **`profiles/all_profiles.json`** — Original profiles (reference)
2. **`profiles/all_profiles_enhanced.json`** — Enhanced orchestrator-first profiles ✅

---

## Key Differences

### 1. Orchestrator-First Guards

**Original (`all_profiles.json`)**:
```markdown
## Active Skill: plan_before_code

1. Gather information before proposing solutions
2. Ask clarifying questions if requirements are ambiguous
...
```

**Enhanced (`all_profiles_enhanced.json`)**:
```markdown
## ⚠️ CHECK ORCHESTRATOR FIRST

**BEFORE doing anything, call `get_workflow_state` to check if Orchestrator assigned you a task.**

If `workflow_state` is empty or you're not the `assigned_profile`:
- Respond: "Please switch to Orchestrator profile first..."
- DO NOT proceed

If you ARE assigned:
- Read the `prompt` field — this tells you EXACTLY what to do
- Read the `success_criteria` — what "done" looks like
- Read `next_profile` and `next_prompt` — what happens after

---

## Active Skill: plan_before_code

1. Gather information before proposing solutions
...
```

✅ **Impact**: Ensures all profiles check for Orchestrator assignment before proceeding

---

### 2. Detailed Prompts in Workflow State

**Original**: Profiles get generic instructions from their profile definition

**Enhanced**: Orchestrator creates SPECIFIC prompts for each profile in `workflow_state`:

```json
{
  "task": "Implement authentication",
  "assigned_profile": "Code",
  "prompt": "Implement auth per Architect's design: 1) POST /auth/register (validate email, hash password with bcrypt, save to DB). 2) POST /auth/login (verify creds, generate JWT). 3) Auth middleware for protected routes. Follow the architecture document exactly. Only implement what's specified - no extra features.",
  "success_criteria": "Working /register and /login endpoints with JWT tokens, auth middleware implemented",
  "next_profile": "Test Engineer",
  "next_prompt": "Write comprehensive tests for authentication: successful registration, duplicate email rejection, successful login, wrong password, invalid token, expired token, protected route access."
}
```

✅ **Impact**: Profiles know EXACTLY what to do; no ambiguity

---

### 3. Instruction Completeness

| Aspect | Original | Enhanced |
|--------|----------|----------|
| **Length** | ~15-30 lines | ~150-300 lines |
| **Process Flow** | Brief bullet points | Detailed step-by-step process |
| **Examples** | None or minimal | Multiple concrete examples |
| **Best Practices** | Mentioned briefly | Detailed guidelines with do/don't examples |
| **Completion Steps** | Not specified | Explicit `add_session_entry` and `switch_profile` calls |

---

### 4. Profile-Specific Enhancements

#### Orchestrator (NEW in Enhanced)

**Original**: Basic orchestration instructions

**Enhanced**:
- Full workflow breakdown (8 steps)
- Detailed subtask creation with prompts
- Example interaction showing full task lifecycle
- Explicit: "You NEVER write code yourself"
- Detailed delegation strategy

**Example Addition**:
```markdown
### Example Interaction:

**User:** "The login button doesn't work"

**You:**
1. Analyze: This is a bug → needs Debug (diagnose) then Code (fix)
2. Create plan with specific prompts for each profile
3. Store plan with `update_workflow_state`
4. Call `switch_profile("Debug", "...")`
```

---

#### Code (Enhanced)

**Original**:
```markdown
## Active Skills: surgical_execution + architecture_respect

- Make MINIMUM changes
- Follow project architecture
- Record changes with `add_session_entry`
```

**Enhanced**:
```markdown
## Active Skills: surgical_execution + architecture_respect

### surgical_execution: Make MINIMUM changes

1. **State Your Scope BEFORE touching files**
   - Example: "I will modify `src/auth.ts` to add password hashing using bcrypt. I will NOT touch login UI or database migration files."
   - Get user confirmation if scope is ambiguous

2. **Make the SMALLEST change that accomplishes the task**
   - If asked to add a feature, add ONLY that feature
   - If asked to fix a bug, fix ONLY that bug
   - Resist the urge to "improve" other code you see
   - No "while I'm here" changes

3. **Follow the Instructions Precisely**
   - If Orchestrator's prompt says "use bcrypt with 12 rounds", don't use 10 rounds
   - If prompt says "add to existing function", don't create a new function
   - If prompt says "don't refactor", don't refactor

### architecture_respect: Follow project patterns

[... detailed guidelines ...]

### Your Process:

1. **Read the Prompt & Context**
   - What am I being asked to do?
   - Is there an Architect plan to follow?
   - What's the success criteria?

[... 6-step detailed process ...]

### If You Hit a Bug:

- Don't try to debug it yourself
- Document what went wrong
- Call `switch_profile("Debug", "Bug encountered: [description]. Need Debug to diagnose before proceeding.")`
```

---

#### Review (Enhanced)

**Original**: Basic review instructions

**Enhanced**:
- Security checklist (8 items)
- Confidence thresholds (95%+ for CRITICAL, 85%+ for WARNING, 75%+ for SUGGESTION)
- Detailed output format template
- What NOT to flag guidelines
- Full review process (5 steps)

**Example Addition**:
```markdown
3. **Security Checklist** (CRITICAL):
   - [ ] **Injection**: SQL injection, command injection, XSS
   - [ ] **Authentication**: Proper auth checks, password storage (bcrypt/argon2)
   - [ ] **Authorization**: Can users access data they shouldn't?
   - [ ] **Data Exposure**: Sensitive data in logs, error messages, or responses
   - [ ] **Input Validation**: All user input validated and sanitized
   - [ ] **Cryptography**: Using secure algorithms (no MD5/SHA1 for passwords)
   - [ ] **Session Management**: Secure tokens, proper expiration
   - [ ] **CORS/CSRF**: Proper protections in place

4. **Confidence Thresholds** (Only flag if confident):
   - **CRITICAL (95%+)**: Security vulnerabilities, data loss risks, crashes
     * Example: "Storing passwords in plain text" - CRITICAL
   - **WARNING (85%+)**: Bugs, logic errors, performance issues
     * Example: "N+1 query in loop" - WARNING
   - **SUGGESTION (75%+)**: Code quality, maintainability
     * Example: "Consider extracting this to a helper function" - SUGGESTION
   - **Below 75%**: Don't comment - gather more context first
```

---

#### Frontend Specialist, Test Engineer, Documentation Specialist (NEW in Enhanced)

**Original**: Brief 5-10 line instructions

**Enhanced**: Full 150+ line instructions with:
- Frontend Specialist: SvelteKit architecture rules, responsive design guidelines, accessibility checklist
- Test Engineer: Test strategy planning, Arrange-Act-Assert pattern, coverage goals by code type
- Documentation Specialist: Multiple documentation templates (API docs, JSDoc, README structure)

---

#### Code Skeptic, Code Simplifier, Code Reviewer (NEW in Enhanced)

**Original**: Basic 5-10 line instructions

**Enhanced**: Full 150+ line instructions with:
- Code Skeptic: "Devil's advocate" question list, severity classification, risk analysis framework
- Code Simplifier: 5 refactoring techniques with before/after examples, incremental process, testing guidelines
- Code Reviewer: PR-style review checklist, structured feedback format, confidence thresholds

---

## Installation Behavior

### Which File Gets Installed?

The `install_profiles` MCP tool reads from the **hardcoded `PROFILES` object** in `mcp_server/server.js`, NOT from the JSON files.

However:
- `profiles/all_profiles.json` — Original profiles (reference/documentation)
- `profiles/all_profiles_enhanced.json` — Enhanced profiles (reference/documentation)
- `mcp_server/server.js` — **Active source** for profile installations

### Recommendation

To use the enhanced profiles, the `PROFILES` object in `mcp_server/server.js` should be updated to include the orchestrator-first guards in the `instructions` field.

**Current server.js**:
```javascript
architect: {
  name: "Architect",
  skills: ["plan_before_code"],
  // ... tools ...
  role: "You are an experienced technical leader...",
  instructions:
    "## Active Skill: plan_before_code\n\n" +
    "1. Gather information before proposing solutions\n" +
    "2. Ask clarifying questions if requirements are ambiguous\n" +
    "3. Break down tasks into numbered steps\n" +
    "4. Use `update_workflow_state` to record your plan\n" +
    "5. Get user approval before recommending a switch to Code profile\n" +
    "6. When planning is complete, call `switch_profile` to recommend Code",
}
```

**Should be** (extract from `all_profiles_enhanced.json`):
```javascript
architect: {
  name: "Architect",
  skills: ["plan_before_code"],
  // ... tools ...
  role: "You are an experienced technical leader...",
  instructions:
    "## ⚠️ CHECK ORCHESTRATOR FIRST\n\n" +
    "**BEFORE doing anything, call `get_workflow_state` to check if Orchestrator assigned you a task.**\n\n" +
    "If `workflow_state` is empty or you're not the `assigned_profile` for the current task:\n" +
    "- Respond: \"Please switch to Orchestrator profile first. Orchestrator will create a plan and delegate tasks to the appropriate profiles.\"\n" +
    "- DO NOT proceed\n\n" +
    "If you ARE assigned a task by Orchestrator:\n" +
    "- Read the `prompt` field carefully — this tells you EXACTLY what to do\n" +
    "- Read the `success_criteria` — this tells you what \"done\" looks like\n" +
    "- Read the `next_profile` and `next_prompt` — understand what happens after you\n\n" +
    "---\n\n" +
    "## Active Skill: plan_before_code\n\n" +
    "[... full instructions from all_profiles_enhanced.json ...]"
}
```

---

## Migration Path

### Option 1: Update server.js (Recommended)

Extract the `instructions` field from each profile in `profiles/all_profiles_enhanced.json` and update the corresponding profile in `mcp_server/server.js`.

**Pros**:
- Single source of truth (server.js)
- Profiles installed via `install_profiles` get full enhanced instructions

**Cons**:
- Large inline strings in server.js (less readable)
- Maintenance: Keep server.js and JSON in sync

### Option 2: Load from JSON File

Modify `mcp_server/server.js` to read profile definitions from `profiles/all_profiles_enhanced.json` at runtime.

**Pros**:
- Cleaner server.js
- Easier to maintain profiles in JSON

**Cons**:
- Adds file I/O dependency
- Path resolution complexity

### Option 3: Hybrid Approach (Current)

Keep brief instructions in server.js, full instructions in JSON.

**Pros**:
- server.js stays readable
- JSON provides reference documentation

**Cons**:
- `install_profiles` installs brief instructions, not full enhanced ones
- Users must manually update their Zed settings with enhanced profiles

---

## Recommendation: Immediate Next Step

**Update `mcp_server/server.js`** to include orchestrator-first guards in the `instructions` field for all profiles.

**Minimal change** (add guard at the start of each profile's instructions):

```javascript
// Add this to the START of EVERY profile's instructions (except Orchestrator)
const ORCHESTRATOR_GUARD = 
  "## ⚠️ CHECK ORCHESTRATOR FIRST\n\n" +
  "**BEFORE doing anything, call `get_workflow_state` to check if Orchestrator assigned you a task.**\n\n" +
  "If `workflow_state` is empty or you're not the `assigned_profile` for the current task:\n" +
  "- Respond: \"Please switch to Orchestrator profile first. Orchestrator will create a plan and delegate tasks to the appropriate profiles.\"\n" +
  "- DO NOT proceed\n\n" +
  "If you ARE assigned a task by Orchestrator:\n" +
  "- Read the `prompt` field carefully — this tells you EXACTLY what to do\n" +
  "- Read the `success_criteria` — this tells you what \"done\" looks like\n" +
  "- Read the `next_profile` and `next_prompt` — understand what happens after you\n\n" +
  "---\n\n";

// Then update each profile:
architect: {
  // ... name, skills, tools, role ...
  instructions: ORCHESTRATOR_GUARD + "## Active Skill: plan_before_code\n\n1. Gather information...",
},

code: {
  // ... name, skills, tools, role ...
  instructions: ORCHESTRATOR_GUARD + "## Active Skills: surgical_execution + architecture_respect\n\n...",
},

// ... etc for all profiles except Orchestrator
```

This ensures that when users run `install_profiles`, they get the orchestrator-first guards without needing to manually copy from `all_profiles_enhanced.json`.

---

## Summary

| Aspect | all_profiles.json | all_profiles_enhanced.json | mcp_server/server.js |
|--------|-------------------|----------------------------|----------------------|
| **Orchestrator Guards** | ❌ No | ✅ Yes | ⚠️ Should add |
| **Detailed Prompts** | ❌ No | ✅ Yes (in examples) | N/A (created at runtime) |
| **Instruction Length** | ~15-30 lines | ~150-300 lines | ~15-30 lines |
| **Examples** | Minimal | ✅ Multiple | Minimal |
| **Process Flow** | Brief | ✅ Detailed step-by-step | Brief |
| **Used By** | Reference | Reference | ✅ `install_profiles` tool |

**Bottom Line**: 
- ✅ `profiles/all_profiles_enhanced.json` is **complete**
- ⚠️ `mcp_server/server.js` should be **updated** to include orchestrator-first guards
- 📖 `profiles/all_profiles.json` serves as **reference** of original simple profiles

---

**Last Updated**: January 20, 2025
