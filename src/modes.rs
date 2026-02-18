use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A custom AI mode definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mode {
    pub slug: String,
    pub name: String,
    #[serde(rename = "roleDefinition")]
    pub role_definition: String,
    pub groups: Vec<PermissionGroup>,
    #[serde(rename = "customInstructions")]
    pub custom_instructions: Option<String>,
    pub source: String,
    #[serde(rename = "stickyModel")]
    pub sticky_model: Option<String>,
}

/// Permission group with optional file restrictions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PermissionGroup {
    Simple(String),
    FileRestricted {
        permission: String,
        #[serde(rename = "fileRegex")]
        file_regex: String,
        description: Option<String>,
    },
}

/// Root structure of .kilocodemodes file
#[derive(Debug, Deserialize)]
struct KiloModesConfig {
    #[serde(rename = "customModes")]
    custom_modes: Vec<Mode>,
}

/// Registry of available modes
pub struct ModeRegistry {
    modes: HashMap<String, Mode>,
    current_mode: Option<String>,
}

impl ModeRegistry {
    pub fn new() -> Self {
        Self {
            modes: HashMap::new(),
            current_mode: None,
        }
    }

    /// Load modes from .kilocodemodes YAML content
    pub fn load_from_yaml(&mut self, yaml_content: &str) -> Result<usize, String> {
        let config: KiloModesConfig = serde_yaml::from_str(yaml_content)
            .map_err(|e| format!("Failed to parse YAML: {}", e))?;

        let count = config.custom_modes.len();
        for mode in config.custom_modes {
            self.modes.insert(mode.slug.clone(), mode);
        }

        Ok(count)
    }

    /// Get a mode by slug
    pub fn get_mode(&self, slug: &str) -> Option<&Mode> {
        self.modes.get(slug)
    }

    /// List all mode slugs
    pub fn list_mode_slugs(&self) -> Vec<String> {
        self.modes.keys().cloned().collect()
    }

    /// Get the current active mode
    pub fn current_mode(&self) -> Option<&str> {
        self.current_mode.as_deref()
    }

    /// Switch to a different mode
    pub fn switch_mode(&mut self, slug: &str) -> Result<(), String> {
        if !self.modes.contains_key(slug) {
            return Err(format!("Mode '{}' not found", slug));
        }
        self.current_mode = Some(slug.to_string());
        Ok(())
    }

    /// Get all modes
    pub fn all_modes(&self) -> Vec<&Mode> {
        self.modes.values().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_mode() {
        let yaml = r#"
customModes:
  - slug: test-mode
    name: Test Mode
    roleDefinition: "You are a test"
    groups:
      - read
      - edit
    source: project
"#;

        let mut registry = ModeRegistry::new();
        let result = registry.load_from_yaml(yaml);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);

        let mode = registry.get_mode("test-mode");
        assert!(mode.is_some());
        assert_eq!(mode.unwrap().name, "Test Mode");
    }

    #[test]
    fn test_parse_file_restricted_mode() {
        let yaml = r#"
customModes:
  - slug: frontend
    name: Frontend
    roleDefinition: "Frontend expert"
    groups:
      - read
      - - edit
        - fileRegex: \.(tsx?|jsx?)$
          description: TS/JS only
    source: project
"#;

        let mut registry = ModeRegistry::new();
        let result = registry.load_from_yaml(yaml);
        assert!(result.is_ok());
    }
}
