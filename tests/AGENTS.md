# Test Agent Rules

- Prefer deterministic fixtures over live Codex or filesystem state.
- Assert public behavior and invariants, not private implementation details.
- Token aggregation tests must include duplicates, replayed parent context, null values, and integer boundaries.
- Accessibility checks are release gates, not optional polish.
- Never place real rollout data, prompts, usernames, or workspace paths in fixtures.
