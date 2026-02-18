use zed_extension_api::{self as zed, Result};

mod modes;
mod orchestrator;
mod commands;

use modes::ModeRegistry;

struct KiloOrchestratorExtension {
    mode_registry: ModeRegistry,
}

impl zed::Extension for KiloOrchestratorExtension {
    fn new() -> Self {
        Self {
            mode_registry: ModeRegistry::new(),
        }
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // Load modes from .kilocodemodes in the project root
        if let Some(modes_path) = worktree.read_text_file(".kilocodemodes") {
            match self.mode_registry.load_from_yaml(&modes_path) {
                Ok(count) => {
                    eprintln!("✅ Loaded {} custom modes from .kilocodemodes", count);
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to load .kilocodemodes: {}", e);
                }
            }
        }

        // This extension doesn't start a language server
        Err("No language server for kilo-orchestrator".into())
    }
}

zed::register_extension!(KiloOrchestratorExtension);
