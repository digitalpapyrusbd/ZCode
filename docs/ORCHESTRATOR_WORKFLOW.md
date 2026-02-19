# Orchestrator-Driven Workflow

## Overview

ZCode uses an **Orchestrator-first workflow** where all tasks begin with the Orchestrator profile. The Orchestrator analyzes requests, creates detailed plans, generates specific prompts for each profile, and coordinates handoffs between profiles.

## How It Works

### 1. User → Orchestrator (Always Start Here)

The user should **always** start by talking to the **Orchestrator profile**. The Orchestrator is the conductor of the multi-agent orchestra.

```
User: "Add a login feature to the app"
  ↓
Orchestrator analyzes the task
  ↓
Orchestrator creates a plan with subtasks
  ↓
Orchestrator delegates to appropriate profiles
```

### 2. Orchestrator Creates the Plan

The Orchestrator breaks down the task and creates specific prompts for each profile:

```json
{
  "current_task": "Add login feature",
  "workflow_status": "planning",
  "active_profile": "Orchestrator",
  "todo_list": [
    {
      "task": "Design login architecture",
      "assigned_profile": "Architect",
      "status": "pending",
      "prompt": "Design the login flow. Choose authentication method (JWT vs sessions). Plan the database schema for users table. Consider security best practices.",
      "next_profile": "Code",
      "next_prompt": "Implement the login endpoints and UI components per Architect's plan."
    },
    {
      "task": "Implement login feature",
      "assigned_profile": "Code",
      "status": "pending",
      "prompt": "Implement the login endpoints and UI components. Follow Architect's design. Use bcrypt for password hashing.",
      "next_profile": "Test Engineer",
      "next_prompt": "Write tests for login success, failure, invalid credentials, and session management."
    },
    {
      "task": "Write tests",
      "assigned_profile": "Test Engineer",
      "status": "pending",
      "prompt": "Write comprehensive tests for the login feature including edge cases.",
      "next_profile": "Review",
      "next_prompt": "Review the implementation for security vulnerabilities and code quality."
    },
    {
      "task": "Security review",
      "assigned_profile": "Review",
      "status": "pending",
      "prompt": "Review the login implementation for security issues: SQL injection, XSS, CSRF, password storage, session management.",
      "next_profile": "Orchestrator",
      "next_prompt": "Return to Orchestrator to verify completion."
    }
  ]
}
```

### 3. Profile Execution

Each profile:

1. **Checks `get_workflow_state` first**
2. **Reads its assigned `prompt`** — this tells it exactly what to do
3. **Executes the task**
4. **Calls `add_session_entry`** to record what was done
5. **Updates workflow_state** to mark task as "done"
6. **Calls `switch_profile`** to recommend the next profile

### 4. Orchestrator-First Guards

Every non-Orchestrator profile has a guard at the top of its instructions:

```
⚠️ CHECK ORCHESTRATOR FIRST

BEFORE doing anything, call `get_workflow_state` to check if Orchestrator assigned you a task.

If workflow_state is empty or you're not the assigned_profile for the current task:
- Respond: "Please switch to Orchestrator profile first. Orchestrator will create a plan and delegate tasks to the appropriate profiles."
- DO NOT proceed
```

This ensures the workflow always starts with the Orchestrator.

## Example Workflow

### User Request: "Fix the broken login button"

1. **User talks to Orchestrator**

```
User: "The login button doesn't work"
```

2. **Orchestrator analyzes and creates plan**

```
Orchestrator calls: analyze_task("fix login button")
  → Suggests: Debug profile

Orchestrator calls: update_workflow_state({
  current_task: "Fix broken login button",
  todo_list: [
    {
      task: "Diagnose login button issue",
      assigned_profile: "Debug",
      prompt: "Reproduce the login button bug. Check browser console for errors. Inspect the event handler. Report findings.",
      next_profile: "Code",
      next_prompt: "Fix the bug identified by Debug."
    },
    {
      task: "Fix the bug",
      assigned_profile: "Code",
      prompt: "Fix the login button bug based on Debug's findings. Test that it works.",
      next_profile: "Review",
      next_prompt: "Verify the fix works and didn't break anything else."
    }
  ]
})

Orchestrator calls: switch_profile("Debug")
Orchestrator: "Switch to Debug profile. Debug will diagnose the login button issue."
```

3. **User switches to Debug profile**

```
User: *switches to Debug profile in Zed*
User: "Start"

Debug calls: get_workflow_state()
  → Sees assigned_profile: "Debug"
  → Reads prompt: "Reproduce the login button bug..."

Debug: *reproduces bug, finds it's a missing event listener*

Debug calls: add_session_entry({
  profile: "Debug",
  summary: "Found missing onClick handler on login button",
  artifacts: ["src/Login.svelte"]
})

Debug calls: switch_profile("Code")
Debug: "Bug identified. Switch to Code profile to fix it."
```

4. **User switches to Code profile**

```
User: *switches to Code profile*
User: "Start"

Code calls: get_workflow_state()
  → Sees assigned_profile: "Code"
  → Reads prompt: "Fix the login button bug based on Debug's findings..."

Code: *adds the missing onClick handler*

Code calls: add_session_entry({
  profile: "Code",
  summary: "Added onClick handler to login button",
  artifacts: ["src/Login.svelte"]
})

Code calls: switch_profile("Review")
Code: "Fix complete. Switch to Review profile to verify."
```

5. **User switches to Review profile**

```
User: *switches to Review*
User: "Start"

Review: *checks the fix, tests manually, runs linting*

Review calls: add_session_entry({
  profile: "Review",
  summary: "Verified login button fix. All tests passing."
})

Review: "Fix verified. Return to Orchestrator to mark task complete."
```

6. **User returns to Orchestrator**

```
User: *switches to Orchestrator*
User: "Is it done?"

Orchestrator calls: get_workflow_state()
  → Sees all tasks marked "done"

Orchestrator: "Task complete! The login button has been fixed, tested, and reviewed."
```

## Key Benefits

1. **Clear delegation** — Each profile knows exactly what to do
2. **No scope creep** — Profiles follow specific instructions
3. **Traceability** — Full session history shows who did what
4. **Coordinated handoffs** — Orchestrator plans the full sequence
5. **Quality control** — Every task goes through appropriate reviews

## MCP Tools Used

| Tool | Used By | Purpose |
|------|---------|---------|
| `analyze_task` | Orchestrator | Determines which profiles are needed |
| `update_workflow_state` | Orchestrator | Creates plan with subtask prompts |
| `get_workflow_state` | All profiles | Reads assigned tasks and prompts |
| `add_session_entry` | All profiles | Records what was accomplished |
| `switch_profile` | All profiles | Recommends next profile in chain |

## Profile Switching

**Important:** Zed does not support programmatic profile switching. When a profile calls `switch_profile`, it returns a **message** telling the user which profile to switch to manually.

The user must:
1. Click the AI panel dropdown in Zed
2. Select the recommended profile
3. Continue the conversation

## State Persistence

Workflow state is stored at `~/.zcode/state.json` and persists across:
- Profile switches
- Zed restarts
- Multiple sessions

Use `clear_workflow_state` to start a fresh task.
