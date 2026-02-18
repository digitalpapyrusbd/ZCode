use crate::modes::{Mode, ModeRegistry};

/// Orchestrator logic for selecting the best mode for a task
pub struct Orchestrator<'a> {
    registry: &'a ModeRegistry,
}

impl<'a> Orchestrator<'a> {
    pub fn new(registry: &'a ModeRegistry) -> Self {
        Self { registry }
    }

    /// Analyze a task and suggest the best mode
    pub fn suggest_mode(&self, task_description: &str) -> Option<&Mode> {
        let task_lower = task_description.to_lowercase();

        // Simple keyword-based routing for now
        // TODO: Use LLM-based routing via MCP for more sophisticated decisions

        let mode_keywords = [
            ("frontend-specialist", vec!["ui", "frontend", "react", "component", "css", "style"]),
            ("test-engineer", vec!["test", "testing", "spec", "qa", "coverage", "unit test"]),
            ("docs-specialist", vec!["docs", "documentation", "readme", "markdown", "explain"]),
            ("code-skeptic", vec!["verify", "check", "review", "audit", "skeptic", "prove"]),
            ("code-simplifier", vec!["refactor", "simplify", "clean", "improve", "optimize"]),
            ("code-reviewer", vec!["review", "feedback", "critique", "assess"]),
        ];

        // Count keyword matches for each mode
        let mut best_match: Option<(&str, usize)> = None;
        for (mode_slug, keywords) in &mode_keywords {
            let match_count = keywords
                .iter()
                .filter(|kw| task_lower.contains(*kw))
                .count();

            if match_count > 0 {
                if let Some((_, current_best)) = best_match {
                    if match_count > current_best {
                        best_match = Some((mode_slug, match_count));
                    }
                } else {
                    best_match = Some((mode_slug, match_count));
                }
            }
        }

        // Return the mode if we found a match
        best_match.and_then(|(slug, _)| self.registry.get_mode(slug))
    }

    /// Generate orchestration prompt for LLM-based routing
    pub fn generate_routing_prompt(&self, task_description: &str) -> String {
        let mode_list = self
            .registry
            .all_modes()
            .iter()
            .map(|m| format!("- **{}** ({}): {}", m.slug, m.name, m.role_definition))
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"# Mode Selection Task

You are an AI orchestrator. Given the task below, select the most appropriate mode.

## Available Modes:
{}

## Task Description:
{}

## Your Response:
Respond with JSON:
{{
  "selected_mode": "mode-slug",
  "reasoning": "Brief explanation of why this mode is best"
}}
"#,
            mode_list, task_description
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modes::ModeRegistry;

    fn sample_registry() -> ModeRegistry {
        let yaml = r#"
customModes:
  - slug: frontend-specialist
    name: Frontend Specialist
    roleDefinition: "Frontend expert"
    groups: [read, edit]
    source: project
  - slug: test-engineer
    name: Test Engineer
    roleDefinition: "Testing expert"
    groups: [read, edit]
    source: project
"#;
        let mut registry = ModeRegistry::new();
        registry.load_from_yaml(yaml).unwrap();
        registry
    }

    #[test]
    fn test_suggest_mode_frontend() {
        let registry = sample_registry();
        let orchestrator = Orchestrator::new(&registry);

        let mode = orchestrator.suggest_mode("Create a new React component for user profile");
        assert!(mode.is_some());
        assert_eq!(mode.unwrap().slug, "frontend-specialist");
    }

    #[test]
    fn test_suggest_mode_testing() {
        let registry = sample_registry();
        let orchestrator = Orchestrator::new(&registry);

        let mode = orchestrator.suggest_mode("Write unit tests for the authentication service");
        assert!(mode.is_some());
        assert_eq!(mode.unwrap().slug, "test-engineer");
    }

    #[test]
    fn test_suggest_mode_no_match() {
        let registry = sample_registry();
        let orchestrator = Orchestrator::new(&registry);

        let mode = orchestrator.suggest_mode("Random unrelated task");
        assert!(mode.is_none());
    }
}
