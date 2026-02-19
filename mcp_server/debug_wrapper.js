#!/usr/bin/env node
// Debug wrapper: logs ALL stdin/stdout traffic to a file, then forwards to server.js
// Usage: node debug_wrapper.js

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "mcp_debug.log");

// Clear previous log
fs.writeFileSync(logFile, "=== MCP Debug Log started at " + new Date().toISOString() + " ===\n");

function log(direction, data) {
  const ts = new Date().toISOString();
  const hex = Buffer.isBuffer(data) ? data.toString("hex").slice(0, 200) : "";
  const text = Buffer.isBuffer(data) ? data.toString("utf-8") : String(data);
  fs.appendFileSync(logFile, `[${ts}] ${direction} (${data.length} bytes):\n${text}\n---HEX(first100bytes): ${hex.slice(0, 200)}\n\n`);
}

// Start the real server
const server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

// Forward stdin → server, logging it
process.stdin.on("data", (chunk) => {
  log("STDIN→SERVER", chunk);
  server.stdin.write(chunk);
});

process.stdin.on("end", () => {
  log("STDIN", Buffer.from("--- END OF STDIN ---"));
  server.stdin.end();
});

// Forward server stdout → stdout, logging it
server.stdout.on("data", (chunk) => {
  log("SERVER→STDOUT", chunk);
  process.stdout.write(chunk);
});

// Forward server stderr → log file
server.stderr.on("data", (chunk) => {
  log("SERVER→STDERR", chunk);
});

server.on("exit", (code) => {
  log("SERVER", Buffer.from("exited with code " + code));
  process.exit(code || 0);
});

server.on("error", (err) => {
  log("SERVER ERROR", Buffer.from(err.message));
  process.exit(1);
});

process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
