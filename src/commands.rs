use crate::modes::ModeRegistry;
use crate::orchestrator::Orchestrator;

/// Handle the /modes slash command
pub fn handle_modes_command(registry: &ModeRegistry) -> String {
    let modes = registry.all_modes();

    if modes.is_empty() {
        return "No custom modes loaded. Create a `.kilocodemodes` file in your project root.".to_string();
    }

    let mut output = String::from("# Available Modes\n\n");

    for mode in modes {
        output.push_str(&format!("## {} ({})\n", mode.name, mode.slug));
        output.push_str(&format!("{}\n\n", mode.role_definition));

        if let Some(current) = registry.current_mode() {
            if current == mode.slug {
                output.push_str("**[ACTIVE]**\n\n");
            }
        }

        output.push_str(&format!("**Permissions:** {:?}\n\n", mode.groups));

        if let Some(instructions) = &mode.custom_instructions {
            output.push_str(&format!("**Instructions:**\n{}\n\n", instructions));
        }

        output.push_str("---\n\n");
    }

    output
}

/// Handle the /mode <slug> slash command
pub fn handle_mode_command(registry: &mut ModeRegistry, slug: &str) -> String {
    match registry.switch_mode(slug) {
        Ok(_) => {
            if let Some(mode) = registry.get_mode(slug) {
                format!(
                    "✅ Switched to mode: **{}**\n\n{}\n\n{}",
                    mode.name,
                    mode.role_definition,
                    mode.custom_instructions.as_deref().unwrap_or("")
                )
            } else {
                "Mode switched but could not retrieve details.".to_string()
            }
        }
        Err(e) => format!("❌ Failed to switch mode: {}", e),
    }
}

/// Handle the /orchestrate <task> slash command
pub fn handle_orchestrate_command(registry: &ModeRegistry, task: &str) -> String {
    let orchestrator = Orchestrator::new(registry);

    match orchestrator.suggest_mode(task) {
        Some(mode) => {
            format!(
                "🎯 **Suggested Mode:** {} ({})\n\n**Reasoning:** This mode is best suited because:\n{}\n\n**Task:** {}\n\nTo activate this mode, use: `/mode {}`",
                mode.name,
                mode.slug,
                mode.role_definition,
                task,
                mode.slug
            )
        }
        None => {
            format!(
                "🤔 No specific mode matched your task. Available modes:\n\n{}\n\nTask: {}",
                registry
                    .list_mode_slugs()
                    .iter()
                    .map(|s| format!("- {}", s))
                    .collect::<Vec<_>>()
                    .join("\n"),
                task
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modes::ModeRegistry;

    fn sample_registry() -> ModeRegistry {
        let yaml = r#"
customModes:
  - slug: test-mode
    name: Test Mode
    roleDefinition: "A test mode"
    groups: [read]
    source: project
"#;
        let mut registry = ModeRegistry::new();
        registry.load_from_yaml(yaml).unwrap();
        registry
    }

    #[test]
    fn test_modes_command_empty() {
        let registry = ModeRegistry::new();
        let output = handle_modes_command(&registry);
        assert!(output.contains("No custom modes"));
    }

    #[test]
    fn test_modes_command_with_modes() {
        let registry = sample_registry();
        let output = handle_modes_command(&registry);
        assert!(output.contains("Test Mode"));
        assert!(output.contains("test-mode"));
    }

    #[test]
    fn test_mode_command_switch() {
        let mut registry = sample_registry();
        let output = handle_mode_command(&mut registry, "test-mode");
        assert!(output.contains("Switched to mode"));
        assert!(output.contains("Test Mode"));
    }

    #[test]
    fn test_mode_command_not_found() {
        let mut registry = sample_registry();
        let output = handle_mode_command(&mut registry, "nonexistent");
        assert!(output.contains("Failed"));
    }
}
