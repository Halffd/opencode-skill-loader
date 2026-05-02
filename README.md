# opencode-skill-loader

OpenCode plugin that discovers and loads skills from SKILL.md files on demand.

Replaces the skill tool from oh-my-openagent with a lightweight, configurable alternative.

## Features

- Discovers skills from `~/.config/opencode/skills/` and `~/.config/opencode/skill/`
- Parses YAML frontmatter (`name`, `description`, `category`, `tags`)
- Checks `.opencode/skills/` in project directory
- Groups skills by category in the tool description
- Matches by exact name, partial substring, tag, or description
- Returns helpful suggestions on miss

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": [
    "plugins/opencode-skill-loader"
  ]
}
```

## Configuration

Pass options as a tuple:

```json
{
  "plugin": [
    ["plugins/opencode-skill-loader", {
      "dirs": ["/custom/skills/path"],
      "includeProjectSkills": true,
      "defaultCategory": "uncategorized",
      "showTags": true
    }]
  ]
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dirs` | `string[]` | `[]` | Additional skill directories to search |
| `includeProjectSkills` | `boolean` | `true` | Search `.opencode/skills/` in the project directory |
| `defaultCategory` | `string` | `"uncategorized"` | Category assigned to skills without one |
| `showTags` | `boolean` | `true` | Show tags in the tool description |

## Build

```bash
bun install
bun build src/index.ts --outdir dist --target bun
```

## License

MIT
