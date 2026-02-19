# Server.js Now Loads from JSON ✅

## What Changed

**Before**: Profiles were hardcoded in `mcp_server/server.js` as a giant JavaScript object.

**After**: `mcp_server/server.js` now **loads profiles from** `profiles/all_profiles_enhanced.json` at startup.

---

## How It Works

### 1. Server Startup

When the MCP server starts:

```javascript
// mcp_server/server.js (line ~133)
const PROFILES = loadProfilesFromJSON();
```

This calls `loadProfilesFromJSON()` which:
1. Reads `../profiles/all_profiles_enhanced.json`
2. Transforms from Zed's profile format to MCP's internal format
3. Returns the profiles object

### 2. Profile Installation

When you call `install_profiles()`:

```
User calls: install_profiles()
  ↓
Reads PROFILES object (loaded from JSON)
  ↓
Transforms to Zed settings format
  ↓
Writes to ~/.config/zed/settings.json
```

---

## Single Source of Truth

```
profiles/all_profiles_enhanced.json
  ↓ (Loaded at server startup)
mcp_server/server.js (PROFILES object)
  ↓ (Written by install_profiles tool)
~/.config/zed/settings.json
  ↓ (Read by Zed)
Zed Profile UI
```

**To modify profiles**:
1. Edit `profiles/all_profiles_enhanced.json`
2. Restart the MCP server (or restart Zed)
3. Run `install_profiles({ overwrite: true })` to update Zed settings

---

## Fallback Behavior

If `profiles/all_profiles_enhanced.json` can't be loaded:
- Server logs an error
- Falls back to minimal Orchestrator and Code profiles
- Server still runs (doesn't crash)

---

## Files Deleted

- ❌ `profiles/all_profiles.json` — No longer needed (was original/reference)

## Files Now Used

- ✅ `profiles/all_profiles_enhanced.json` — **SINGLE SOURCE OF TRUTH**
- ✅ `mcp_server/server.js` — Loads from JSON, not hardcoded

---

## Testing

Verified that:
- ✅ All 12 profiles load correctly
- ✅ Skills are extracted properly
- ✅ Instructions include orchestrator-first guards
- ✅ Server starts without errors
- ✅ MCP tools work correctly

---

**Last Updated**: January 20, 2025  
**Change**: Made `server.js` load from `all_profiles_enhanced.json` instead of hardcoding profiles
