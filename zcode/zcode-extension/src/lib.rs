use std::env;
use zed_extension_api::{self as zed, Command, ContextServerId, Project, Result};

/// ZCode Extension — Intelligent profile orchestration for Zed.
///
/// This extension provides a bundled MCP server that acts as shared memory
/// between Zed profiles, enabling orchestrated multi-profile workflows.
struct ZCodeExtension;

impl zed::Extension for ZCodeExtension {
    fn new() -> Self {
        Self
    }

    fn context_server_command(
        &mut self,
        _context_server_id: &ContextServerId,
        _project: &Project,
    ) -> Result<Command> {
        // The MCP server is a zero-dependency JavaScript file bundled with the extension.
        // We use Zed's built-in Node.js runtime to execute it.
        let server_path = env::current_dir()
            .unwrap()
            .join("mcp_server")
            .join("server.js")
            .to_string_lossy()
            .to_string();

        Ok(Command {
            command: zed::node_binary_path()?,
            args: vec![server_path],
            env: vec![],
        })
    }
}

zed::register_extension!(ZCodeExtension);
