#!/usr/bin/env node
// ZCode Orchestrator MCP Server
// Zero-dependency MCP server implementing JSON-RPC over stdio.
// Provides orchestration tools for multi-profile workflow coordination in Zed.

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------------------------------------------------------------------------
// Zed settings.json path detection
// ---------------------------------------------------------------------------

function getSettingsPath() {
  const platform = process.platform;
  if (platform === "win32") {
    return path.join(process.env.APPDATA || "", "Zed", "settings.json");
  } else if (platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Zed",
      "settings.json",
    );
  } else {
    return path.join(os.homedir(), ".config", "zed", "settings.json");
  }
}

/**
 * Strip JSON comments (// and block comments) so we can parse Zed's JSONC.
 * Also strips trailing commas before } or ].
 */
function stripJsonComments(text) {
  let result = "";
  let i = 0;
  let inString = false;
  let escape = false;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inString) {
      result += ch;
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // Line comment
    if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }

    // Block comment
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length - 1 && !(text[i] === "*" && text[i + 1] === "/"))
        i++;
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  // Strip trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, "$1");
  return result;
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

const STATE_DIR = path.join(os.homedir(), ".zcode");
const STATE_FILE = path.join(STATE_DIR, "state.json");

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadState() {
  ensureStateDir();
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    } catch {
      return defaultState();
    }
  }
  return defaultState();
}

function saveState(state) {
  ensureStateDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function defaultState() {
  return {
    current_task: null,
    todo_list: [],
    session_history: [],
    active_profile: null,
    workflow_status: "idle",
  };
}

// ---------------------------------------------------------------------------
// Profile definitions
// ---------------------------------------------------------------------------

const PROFILES = {
  architect: {
    name: "Architect",
    skills: ["plan_before_code"],
    tools_enabled: {
      terminal: false,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: true,
      fetch: true,
      diagnostics: true,
    },
    best_for: "Planning, design, architecture, breaking down complex tasks",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are an experienced technical leader who is an inquisitive and excellent planner. You think deeply before acting and break complex tasks into manageable steps.",
    instructions:
      "## Active Skill: plan_before_code\n\n1. Gather information before proposing solutions\n2. Ask clarifying questions if requirements are ambiguous\n3. Break down tasks into numbered steps\n4. Use `update_workflow_state` to record your plan\n5. Get user approval before recommending a switch to Code profile\n6. When planning is complete, call `switch_profile` to recommend Code",
  },
  code: {
    name: "Code",
    skills: ["surgical_execution", "architecture_respect"],
    tools_enabled: {
      terminal: true,
      create_directory: true,
      delete_path: true,
      move_path: true,
      read_file: true,
      edit_file: true,
      fetch: true,
      diagnostics: true,
    },
    best_for: "Implementation, coding, bug fixes",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.",
    instructions:
      "## Active Skills: surgical_execution + architecture_respect\n\n### surgical_execution\n- Make the MINIMUM change that achieves the task\n- State exact scope before touching files\n- No 'while I'm here' changes\n\n### architecture_respect\n- Follow the project's established architecture\n- Check `get_workflow_state` first to see if there's a plan from Architect\n- When done, call `add_session_entry` to record what you changed\n- If you hit a bug, call `switch_profile` to recommend Debug",
  },
  debug: {
    name: "Debug",
    skills: ["root_cause_debugging", "surgical_execution"],
    tools_enabled: {
      terminal: true,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: true,
      fetch: false,
      diagnostics: true,
    },
    best_for: "Systematic debugging, finding root causes",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a systematic debugger who methodically traces issues to their root cause. You never guess — you gather evidence first.",
    instructions:
      "## Active Skills: root_cause_debugging + surgical_execution\n\n### root_cause_debugging\n1. Reproduce the problem first\n2. Read error messages and stack traces carefully\n3. Form a hypothesis\n4. Add logging/assertions to verify\n5. Fix the root cause, not symptoms\n\n### surgical_execution\n- Fix ONLY the bug — no refactoring while debugging\n- Call `get_workflow_state` first for context\n- Record findings with `add_session_entry`\n- When fixed, call `switch_profile` to recommend Code or Review",
  },
  ask: {
    name: "Ask",
    skills: [],
    tools_enabled: {
      terminal: false,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: false,
      fetch: true,
      diagnostics: false,
    },
    best_for: "Questions, explanations, learning",
    model_suggestion: { provider: "copilot_chat", model: "gpt-4o" },
    role: "You are a knowledgeable teacher who explains concepts clearly with examples. You read code to understand it but never modify it.",
    instructions:
      "## Informational Only\n\n- Answer questions thoroughly with examples\n- Read code to understand it, but NEVER edit\n- If the user wants changes, suggest switching to Code profile\n- Use `analyze_task` if the user's question evolves into a task",
  },
  orchestrator: {
    name: "Orchestrator",
    skills: ["plan_before_code"],
    tools_enabled: {
      terminal: false,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: false,
      fetch: true,
      diagnostics: false,
    },
    best_for: "Multi-profile workflow coordination",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a workflow coordinator. You analyze tasks, create plans, delegate to the right profiles, and track progress across the entire workflow.",
    instructions:
      "## Orchestration Workflow\n\n1. Call `analyze_task` to determine the best starting profile\n2. Create a plan with `update_workflow_state`\n3. Recommend profile switches with `switch_profile`\n4. After each phase, check `get_workflow_state` to track progress\n5. Coordinate the full lifecycle: Plan \u2192 Build \u2192 Test \u2192 Review",
  },
  review: {
    name: "Review",
    skills: ["architecture_respect"],
    tools_enabled: {
      terminal: true,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: false,
      fetch: true,
      diagnostics: true,
    },
    best_for: "Code review, quality checks",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a thorough code reviewer who checks for correctness, security, performance, and adherence to project conventions.",
    instructions:
      "## Active Skill: architecture_respect\n\n- Review code for correctness, security, and style\n- Check architecture compliance\n- Run tests and linting via terminal\n- DO NOT make changes \u2014 only report findings\n- Record review results with `add_session_entry`\n- If changes are needed, call `switch_profile` to recommend Code",
  },
  frontend_specialist: {
    name: "Frontend Specialist",
    skills: ["architecture_respect", "surgical_execution"],
    tools_enabled: {
      terminal: true,
      create_directory: true,
      delete_path: true,
      move_path: true,
      read_file: true,
      edit_file: true,
      fetch: true,
      diagnostics: true,
    },
    best_for: "UI/UX work, SvelteKit, CSS, components",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a frontend expert specializing in UI/UX, SvelteKit, CSS, and modern web components.",
    instructions:
      "## Active Skills: architecture_respect + surgical_execution\n\n### Frontend Rules\n- Follow: +page.svelte \u2192 $lib/stores \u2192 $lib/utils/api.ts \u2192 Backend\n- Use SvelteKit conventions\n- Ensure responsive design\n- Check `get_workflow_state` for design specs from Architect\n- Record changes with `add_session_entry`",
  },
  test_engineer: {
    name: "Test Engineer",
    skills: ["plan_before_code"],
    tools_enabled: {
      terminal: true,
      create_directory: true,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: true,
      fetch: false,
      diagnostics: true,
    },
    best_for: "Writing tests, test strategy, coverage",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a testing expert who writes comprehensive, maintainable tests with good coverage.",
    instructions:
      "## Active Skill: plan_before_code\n\n1. Check `get_workflow_state` for what was implemented\n2. Plan test strategy before writing tests\n3. Write unit tests, integration tests as appropriate\n4. Run tests and report results\n5. Record test coverage with `add_session_entry`",
  },
  documentation: {
    name: "Documentation Specialist",
    skills: [],
    tools_enabled: {
      terminal: false,
      create_directory: true,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: true,
      fetch: true,
      diagnostics: false,
    },
    best_for: "Writing docs, READMEs, guides",
    model_suggestion: { provider: "copilot_chat", model: "gpt-4o" },
    role: "You are a technical writer who creates clear, well-structured documentation.",
    instructions:
      "## Documentation Guidelines\n\n- Read code to understand it, then document it\n- Write READMEs, guides, API docs, changelogs\n- Use clear language with examples\n- Follow project documentation conventions\n- Check `get_workflow_state` for context on what to document",
  },
  code_skeptic: {
    name: "Code Skeptic",
    skills: ["architecture_respect"],
    tools_enabled: {
      terminal: false,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: false,
      fetch: true,
      diagnostics: true,
    },
    best_for: "Quality inspection, finding issues, questioning assumptions",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a critical thinker who questions assumptions, identifies code smells, and finds potential issues before they become problems.",
    instructions:
      "## Active Skill: architecture_respect\n\n- Question every assumption\n- Look for code smells, security risks, over-engineering\n- Read but NEVER edit code\n- Report concerns with severity levels\n- Record findings with `add_session_entry`",
  },
  code_simplifier: {
    name: "Code Simplifier",
    skills: ["surgical_execution"],
    tools_enabled: {
      terminal: true,
      create_directory: false,
      delete_path: true,
      move_path: true,
      read_file: true,
      edit_file: true,
      fetch: false,
      diagnostics: true,
    },
    best_for: "Refactoring, reducing complexity, cleaning up",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a refactoring expert who reduces complexity, removes duplication, and makes code cleaner without changing behavior.",
    instructions:
      "## Active Skill: surgical_execution\n\n- Simplify without changing behavior\n- Remove dead code and duplication\n- Extract functions, reduce nesting\n- Run tests after every change\n- Record refactoring with `add_session_entry`",
  },
  code_reviewer: {
    name: "Code Reviewer",
    skills: ["architecture_respect", "surgical_execution"],
    tools_enabled: {
      terminal: true,
      create_directory: false,
      delete_path: false,
      move_path: false,
      read_file: true,
      edit_file: false,
      fetch: true,
      diagnostics: true,
    },
    best_for: "PR review, detailed code analysis",
    model_suggestion: { provider: "copilot_chat", model: "claude-sonnet-4-5" },
    role: "You are a senior engineer performing detailed PR-style code reviews with constructive feedback.",
    instructions:
      "## Active Skills: architecture_respect + surgical_execution\n\n- Review changes file by file\n- Check for correctness, performance, security, style\n- Use terminal to run git diff, tests, linting\n- DO NOT make changes \u2014 only review and report\n- Structure feedback as: Critical / Important / Suggestion\n- Record review with `add_session_entry`",
  },
};

// ---------------------------------------------------------------------------
// Profile installer — writes profiles into Zed's settings.json
// Writes to agent.profiles as an OBJECT keyed by slug (Zed's actual format)
// ---------------------------------------------------------------------------

/**
 * Convert profile name to slug: "Frontend Specialist" -> "frontend-specialist"
 */
function toSlug(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Build a profile settings object keyed by slug, ready for agent.profiles.
 */
function buildProfileSettingsObject() {
  var result = {};
  var keys = Object.keys(PROFILES);
  for (var i = 0; i < keys.length; i++) {
    var p = PROFILES[keys[i]];
    var slug = toSlug(p.name);
    result[slug] = {
      name: p.name,
      default_model: p.model_suggestion,
      tools: p.tools_enabled,
      enable_all_context_servers: true,
      context_servers: {},
      role: p.role,
      instructions: p.instructions,
    };
  }
  return result;
}

function installProfiles(options) {
  var settingsPath = getSettingsPath();
  var overwrite = options.overwrite || false;
  var profileNames = options.profiles || null; // null = install all

  // Check settings file exists
  if (!fs.existsSync(settingsPath)) {
    return {
      success: false,
      error: "Zed settings.json not found at: " + settingsPath,
      hint: "Make sure Zed is installed and has been opened at least once.",
    };
  }

  // Read
  var rawContent;
  try {
    rawContent = fs.readFileSync(settingsPath, "utf-8");
  } catch (err) {
    return {
      success: false,
      error: "Cannot read settings.json: " + err.message,
    };
  }

  // Parse (strip JSONC comments)
  var settings;
  try {
    settings = JSON.parse(stripJsonComments(rawContent));
  } catch (err) {
    return {
      success: false,
      error: "Cannot parse settings.json: " + err.message,
    };
  }

  // Backup
  var backupPath = settingsPath + ".zcode-backup";
  try {
    fs.writeFileSync(backupPath, rawContent, "utf-8");
  } catch (err) {
    return {
      success: false,
      error: "Cannot create backup: " + err.message,
    };
  }

  // Ensure agent.profiles object exists
  if (!settings.agent) settings.agent = {};
  if (!settings.agent.profiles || typeof settings.agent.profiles !== "object") {
    settings.agent.profiles = {};
  }

  // Build profiles to install
  var allProfiles = buildProfileSettingsObject();
  var slugsToInstall = Object.keys(allProfiles);

  // Filter if specific profiles requested
  if (profileNames) {
    var wantedSlugs = {};
    for (var i = 0; i < profileNames.length; i++) {
      wantedSlugs[toSlug(profileNames[i])] = true;
    }
    slugsToInstall = slugsToInstall.filter(function (s) {
      return wantedSlugs[s] === true;
    });
  }

  var installed = [];
  var skipped = [];

  for (var j = 0; j < slugsToInstall.length; j++) {
    var slug = slugsToInstall[j];
    if (settings.agent.profiles[slug] && !overwrite) {
      skipped.push(allProfiles[slug].name);
    } else {
      settings.agent.profiles[slug] = allProfiles[slug];
      installed.push(allProfiles[slug].name);
    }
  }

  // Write
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    // Attempt restore
    try {
      fs.writeFileSync(settingsPath, rawContent, "utf-8");
    } catch (_) {
      /* ignore */
    }
    return {
      success: false,
      error: "Cannot write settings.json: " + err.message,
    };
  }

  return {
    success: true,
    installed: installed,
    skipped: skipped,
    backup_path: backupPath,
    settings_path: settingsPath,
    message:
      installed.length > 0
        ? "Installed " +
          installed.length +
          " profile(s). " +
          skipped.length +
          " skipped (already exist). Backup saved to " +
          backupPath
        : "All profiles already exist. Nothing to install. Use overwrite:true to replace them.",
  };
}

// ---------------------------------------------------------------------------
// Task analysis — keyword-based profile recommendation
// ---------------------------------------------------------------------------

const PROFILE_KEYWORDS = {
  architect: [
    "plan",
    "design",
    "architect",
    "break down",
    "strategy",
    "approach",
    "structure",
    "organize",
    "outline",
    "blueprint",
    "high-level",
    "scope",
    "requirements",
    "specification",
  ],
  code: [
    "implement",
    "build",
    "create",
    "code",
    "write",
    "add",
    "feature",
    "develop",
    "function",
    "method",
    "class",
    "component",
    "api",
    "endpoint",
    "fix",
    "update",
    "change",
    "modify",
  ],
  debug: [
    "debug",
    "error",
    "bug",
    "crash",
    "broken",
    "not working",
    "fails",
    "issue",
    "problem",
    "investigate",
    "diagnose",
    "trace",
    "stack",
    "exception",
    "undefined",
    "null",
  ],
  ask: [
    "explain",
    "what is",
    "how does",
    "why",
    "tell me",
    "describe",
    "understand",
    "learn",
    "difference between",
    "compare",
  ],
  review: [
    "review",
    "check",
    "audit",
    "inspect",
    "evaluate",
    "assess",
    "quality",
    "pr review",
    "pull request",
    "feedback",
  ],
  frontend_specialist: [
    "frontend",
    "ui",
    "ux",
    "css",
    "style",
    "svelte",
    "component",
    "layout",
    "responsive",
    "animation",
    "page",
    "form",
    "button",
  ],
  test_engineer: [
    "test",
    "spec",
    "coverage",
    "unit test",
    "integration test",
    "e2e",
    "testing",
    "assert",
    "mock",
    "fixture",
    "jest",
    "vitest",
  ],
  documentation: [
    "document",
    "readme",
    "docs",
    "guide",
    "tutorial",
    "jsdoc",
    "comment",
    "changelog",
    "wiki",
  ],
  code_simplifier: [
    "refactor",
    "simplify",
    "clean",
    "reduce",
    "extract",
    "dry",
    "consolidate",
    "merge",
    "optimize",
  ],
  code_skeptic: [
    "smell",
    "concern",
    "risk",
    "security",
    "vulnerability",
    "over-engineered",
    "unnecessary",
    "complexity",
    "questionable",
  ],
};

function analyzeTask(taskDescription) {
  const lower = taskDescription.toLowerCase();
  const scores = {};

  for (const [profile, keywords] of Object.entries(PROFILE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[profile] = score;
  }

  const sorted = Object.entries(scores).sort(function (a, b) {
    return b[1] - a[1];
  });

  if (sorted.length === 0) {
    return {
      suggested_profile: "code",
      confidence: 0.3,
      reasoning: "No strong keyword matches found. Defaulting to Code profile.",
      alternatives: ["architect", "ask"],
    };
  }

  const topScore = sorted[0][1];

  return {
    suggested_profile: sorted[0][0],
    confidence: Math.min(topScore / 5, 1.0),
    reasoning:
      "Matched " +
      topScore +
      ' keyword(s) for the "' +
      sorted[0][0] +
      '" profile.',
    alternatives: sorted.slice(1, 4).map(function (s) {
      return s[0];
    }),
  };
}

// ---------------------------------------------------------------------------
// MCP Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "install_profiles",
    description:
      "Install ZCode profiles into Zed's settings.json automatically. Backs up settings.json first, then merges profiles without overwriting existing ones. Call this on first setup or when new profiles are available.",
    inputSchema: {
      type: "object",
      properties: {
        profiles: {
          type: "array",
          items: { type: "string" },
          description:
            'Optional list of profile names to install (e.g. ["Architect", "Code", "Debug"]). If omitted, installs all 12 profiles.',
        },
        overwrite: {
          type: "boolean",
          description:
            "If true, overwrite existing profiles with the same name. Default: false (skip existing).",
        },
      },
    },
  },
  {
    name: "analyze_task",
    description:
      "Analyze a task description and recommend the best Zed profile to use. Returns a suggested profile with confidence score and reasoning.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task or request to analyze.",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "switch_profile",
    description:
      "Recommend a profile switch to the user. Returns a human-readable message with instructions on how to switch profiles in Zed. This tool CANNOT switch profiles automatically.",
    inputSchema: {
      type: "object",
      properties: {
        profile: {
          type: "string",
          description:
            "The profile name to switch to (e.g. 'architect', 'code', 'debug').",
        },
        reason: {
          type: "string",
          description: "Why the switch is recommended.",
        },
      },
      required: ["profile"],
    },
  },
  {
    name: "get_workflow_state",
    description:
      "Retrieve the current workflow state including task, todo list, and session history. This is the shared memory between profiles.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_workflow_state",
    description:
      "Update the workflow state. Use this to persist task progress, update the todo list, or record important context that should survive profile switches.",
    inputSchema: {
      type: "object",
      properties: {
        current_task: {
          type: "string",
          description: "The current high-level task description.",
        },
        todo_list: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string" },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "done", "blocked"],
              },
              assigned_profile: { type: "string" },
              notes: { type: "string" },
            },
            required: ["task", "status"],
          },
          description: "List of todo items with status.",
        },
        active_profile: {
          type: "string",
          description: "The currently active profile name.",
        },
        workflow_status: {
          type: "string",
          enum: ["idle", "planning", "executing", "reviewing", "complete"],
          description: "Overall workflow status.",
        },
      },
    },
  },
  {
    name: "add_session_entry",
    description:
      "Add an entry to the session history. Use this to record what was accomplished in the current profile session before switching.",
    inputSchema: {
      type: "object",
      properties: {
        profile: {
          type: "string",
          description: "Which profile created this entry.",
        },
        summary: {
          type: "string",
          description: "Summary of what was done in this session.",
        },
        artifacts: {
          type: "array",
          items: { type: "string" },
          description: "List of files created/modified in this session.",
        },
      },
      required: ["profile", "summary"],
    },
  },
  {
    name: "list_profiles",
    description:
      "List all available ZCode profiles with their skills, tool permissions, and recommended use cases.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_profile_info",
    description: "Get detailed information about a specific profile.",
    inputSchema: {
      type: "object",
      properties: {
        profile: {
          type: "string",
          description: "The profile name (e.g. 'architect', 'code', 'debug').",
        },
      },
      required: ["profile"],
    },
  },
  {
    name: "clear_workflow_state",
    description:
      "Reset the workflow state to its defaults. Use this when starting a completely new task.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function handleToolCall(name, args) {
  switch (name) {
    case "install_profiles": {
      const result = installProfiles({
        profiles: args.profiles || null,
        overwrite: args.overwrite || false,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.success,
      };
    }

    case "analyze_task": {
      const result = analyzeTask(args.task || "");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case "switch_profile": {
      const profileKey = (args.profile || "")
        .toLowerCase()
        .replace(/\s+/g, "_");
      const profile = PROFILES[profileKey];
      if (!profile) {
        return {
          content: [
            {
              type: "text",
              text:
                'Unknown profile "' +
                args.profile +
                '". Available profiles: ' +
                Object.keys(PROFILES).join(", "),
            },
          ],
          isError: true,
        };
      }

      const reason =
        args.reason || "This profile is better suited for the current task.";
      const message = [
        "## \ud83d\udd04 Profile Switch Recommended: **" + profile.name + "**",
        "",
        "**Why:** " + reason,
        "",
        "**To switch:**",
        "1. Click the profile dropdown in the Zed assistant panel (top area)",
        "2. Select **" + profile.name + "**",
        "3. Continue your conversation",
        "",
        "**What " + profile.name + " is best for:** " + profile.best_for,
        "**Skills:** " +
          (profile.skills.length > 0
            ? profile.skills.join(", ")
            : "none (informational)"),
        "",
        "\ud83d\udca1 **Tip:** After switching, call `get_workflow_state` to pick up context from this session.",
      ].join("\n");

      // Record the recommendation
      const state = loadState();
      state.session_history.push({
        timestamp: new Date().toISOString(),
        profile: state.active_profile || "unknown",
        action: "switch_recommended",
        target_profile: profileKey,
        reason: reason,
      });
      saveState(state);

      return {
        content: [{ type: "text", text: message }],
      };
    }

    case "get_workflow_state": {
      const state = loadState();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    }

    case "update_workflow_state": {
      const state = loadState();
      if (args.current_task !== undefined)
        state.current_task = args.current_task;
      if (args.todo_list !== undefined) state.todo_list = args.todo_list;
      if (args.active_profile !== undefined)
        state.active_profile = args.active_profile;
      if (args.workflow_status !== undefined)
        state.workflow_status = args.workflow_status;
      saveState(state);
      return {
        content: [
          {
            type: "text",
            text:
              "Workflow state updated successfully.\n\n" +
              JSON.stringify(state, null, 2),
          },
        ],
      };
    }

    case "add_session_entry": {
      const state = loadState();
      state.session_history.push({
        timestamp: new Date().toISOString(),
        profile: args.profile,
        summary: args.summary,
        artifacts: args.artifacts || [],
      });
      saveState(state);
      return {
        content: [
          {
            type: "text",
            text: 'Session entry recorded for profile "' + args.profile + '".',
          },
        ],
      };
    }

    case "list_profiles": {
      const rows = Object.entries(PROFILES).map(function ([key, p]) {
        return {
          id: key,
          name: p.name,
          skills: p.skills,
          best_for: p.best_for,
          tools_enabled: Object.entries(p.tools_enabled)
            .filter(function ([, v]) {
              return v;
            })
            .map(function ([k]) {
              return k;
            }),
        };
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    }

    case "get_profile_info": {
      const profileKey = (args.profile || "")
        .toLowerCase()
        .replace(/\s+/g, "_");
      const profile = PROFILES[profileKey];
      if (!profile) {
        return {
          content: [
            {
              type: "text",
              text:
                'Unknown profile "' +
                args.profile +
                '". Available: ' +
                Object.keys(PROFILES).join(", "),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: profileKey, ...profile }, null, 2),
          },
        ],
      };
    }

    case "clear_workflow_state": {
      const fresh = defaultState();
      saveState(fresh);
      return {
        content: [
          {
            type: "text",
            text: "Workflow state cleared. Ready for a new task.",
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: "Unknown tool: " + name }],
        isError: true,
      };
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC / MCP protocol over stdio
// ---------------------------------------------------------------------------

const SERVER_INFO = {
  name: "zcode-orchestrator",
  version: "0.1.0",
};

const CAPABILITIES = {
  tools: {},
};

function handleMessage(msg) {
  const { method, id, params } = msg;

  switch (method) {
    case "initialize": {
      const clientProtocolVersion =
        (params && params.protocolVersion) || "2025-03-26";
      return {
        jsonrpc: "2.0",
        id: id,
        result: {
          protocolVersion: clientProtocolVersion,
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
        },
      };
    }

    case "notifications/initialized":
      return null;

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: id,
        result: { tools: TOOLS },
      };

    case "tools/call": {
      const toolName = params && params.name;
      const toolArgs = (params && params.arguments) || {};
      const result = handleToolCall(toolName, toolArgs);
      return {
        jsonrpc: "2.0",
        id: id,
        result: result,
      };
    }

    case "ping":
      return {
        jsonrpc: "2.0",
        id: id,
        result: {},
      };

    default:
      if (id !== undefined) {
        return {
          jsonrpc: "2.0",
          id: id,
          error: {
            code: -32601,
            message: "Method not found: " + method,
          },
        };
      }
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stdio transport — supports BOTH line-delimited JSON and Content-Length framed JSON-RPC
// ---------------------------------------------------------------------------

let inputBuffer = Buffer.alloc(0);
let contentLength = -1;
let transportMode = "auto"; // "auto" | "line" | "framed"

function sendResponse(msg) {
  const json = JSON.stringify(msg);

  // If client is line-delimited, reply line-delimited.
  if (transportMode === "line") {
    process.stdout.write(json + "\n");
    return;
  }

  // Default / framed mode
  const byteLength = Buffer.byteLength(json, "utf-8");
  process.stdout.write("Content-Length: " + byteLength + "\r\n\r\n");
  process.stdout.write(json);
}

function handleParsedMessage(msg) {
  try {
    const response = handleMessage(msg);
    if (response) sendResponse(response);
  } catch (err) {
    sendResponse({
      jsonrpc: "2.0",
      id: msg && msg.id !== undefined ? msg.id : null,
      error: { code: -32603, message: "Internal error: " + err.message },
    });
  }
}

process.stdin.on("data", function (chunk) {
  inputBuffer = Buffer.concat([
    inputBuffer,
    Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
  ]);

  while (inputBuffer.length > 0) {
    // 1) Try framed parsing first if header present
    const headerEnd = inputBuffer.indexOf("\r\n\r\n");
    if (contentLength !== -1 || headerEnd !== -1) {
      if (contentLength === -1) {
        const headerStr = inputBuffer.slice(0, headerEnd).toString("utf-8");
        const match = headerStr.match(/Content-Length:\s*(\d+)/i);
        if (match) {
          transportMode = "framed";
          contentLength = parseInt(match[1], 10);
          inputBuffer = inputBuffer.slice(headerEnd + 4);
        }
      }

      if (contentLength !== -1) {
        if (inputBuffer.length < contentLength) return;
        const messageBytes = inputBuffer.slice(0, contentLength);
        inputBuffer = inputBuffer.slice(contentLength);
        contentLength = -1;

        try {
          const msg = JSON.parse(messageBytes.toString("utf-8"));
          handleParsedMessage(msg);
        } catch (err) {
          sendResponse({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error: " + err.message },
          });
        }
        continue;
      }
    }

    // 2) Line-delimited mode
    const nlIdx = inputBuffer.indexOf("\n");
    if (nlIdx === -1) {
      // Try whole-buffer JSON (single message without newline)
      const text = inputBuffer.toString("utf-8").trim();
      if (text.startsWith("{") && text.endsWith("}")) {
        try {
          const msg = JSON.parse(text);
          if (transportMode === "auto") transportMode = "line";
          inputBuffer = Buffer.alloc(0);
          handleParsedMessage(msg);
        } catch (_) {
          // wait for more bytes
        }
      }
      return;
    }

    const line = inputBuffer.slice(0, nlIdx).toString("utf-8").trim();
    inputBuffer = inputBuffer.slice(nlIdx + 1);
    if (!line) continue;

    try {
      const msg = JSON.parse(line);
      if (transportMode === "auto") transportMode = "line";
      handleParsedMessage(msg);
    } catch (err) {
      sendResponse({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: " + err.message },
      });
    }
  }
});

process.stdin.on("end", function () {
  process.exit(0);
});
