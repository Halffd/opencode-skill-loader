# opencode-skill-loader

Discovers and loads "skills" (SKILL.md files with YAML frontmatter) from multiple directories, making them available as a tool the AI agent can invoke to inject domain-specific instructions into its context.

## Features

- **Discovers skills** by scanning directories for `SKILL.md` files with YAML frontmatter (name, description, category, tags)
- **Default skill directories** - `~/.config/opencode/skills/` and `~/.config/opencode/skill/`
- **Project-level skills** from `.opencode/skills/` within the project directory
- **Flexible matching** - exact match, then partial/substring match, then tag/description search
- **Auto-generated tool description** listing all available skills grouped by category
- **Deduplication** by skill name across directories
- **Suggestions** for near-matches when a skill is not found

## Installation

In `opencode.json`:

**npm/bun:**

```json
{
  "plugin": [
    "@Halffd/opencode-skill-loader"
  ]
}
```

**GitHub:**

```json
{
  "plugin": [
    "github:Halffd/opencode-skill-loader"
  ]
}
```

**Local:**

```json
{
  "plugin": [
    "file:///absolute/path/to/opencode-skill-loader"
  ]
}
```

## Tool

The `skill` tool is exposed with a `name` parameter (partial match supported). When invoked, the skill content is injected into the agent's context.

## Configuration

Config (in `opencode.json`):

| Option | Default | Description |
|--------|---------|-------------|
| `dirs` | `[]` | Additional directories to scan for skills |
| `includeProjectSkills` | `true` | Whether to scan `.opencode/skills/` in the project |
| `defaultCategory` | `"uncategorized"` | Default category for skills without one |
| `showTags` | `true` | Show tags in the skill listing description |

## Skill Format

Skills are `SKILL.md` files with YAML frontmatter:

```markdown
---
name: my-skill
description: A brief description of what this skill does
category: code
tags: [refactoring, patterns]
---

Skill content goes here.
```
