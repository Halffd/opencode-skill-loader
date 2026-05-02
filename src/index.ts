import { readdir, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { tool } from "@opencode-ai/plugin";

interface SkillEntry {
  name: string;
  description: string;
  category: string;
  tags: string[];
  path: string;
  content: string;
}

interface SkillLoaderOptions {
  dirs?: string[];
  includeProjectSkills?: boolean;
  defaultCategory?: string;
  showTags?: boolean;
}

const HOME = homedir();

function parseFrontmatter(raw: string): {
  meta: Record<string, any>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const yaml = match[1];
  const body = match[2];
  const meta: Record<string, any> = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^(\S+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      meta[key] = trimmed
        .slice(1, -1)
        .split(",")
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      meta[key] = trimmed.replace(/^["']|["']$/g, "");
    }
  }
  return { meta, body };
}

async function discoverSkills(
  dirs: string[],
  defaultCategory: string,
): Promise<SkillEntry[]> {
  const seen = new Set<string>();
  const skills: SkillEntry[] = [];

  for (const skillsDir of dirs) {
    let entries: string[];
    try {
      entries = await readdir(skillsDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const skillPath = join(skillsDir, entry);
      const skillFile = join(skillPath, "SKILL.md");

      try {
        const { stat } = await import("node:fs/promises");
        if (!(await stat(skillFile)).isFile()) continue;
      } catch {
        continue;
      }

      const raw = await readFile(skillFile, "utf-8");
      const { meta, body } = parseFrontmatter(raw);

      const name = meta.name || basename(skillPath);
      if (seen.has(name)) continue;
      seen.add(name);

      skills.push({
        name,
        description: meta.description || "",
        category: meta.category || defaultCategory,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        path: skillPath,
        content: body.trim(),
      });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

function formatSkillList(skills: SkillEntry[], showTags: boolean): string {
  const grouped = new Map<string, SkillEntry[]>();
  for (const s of skills) {
    const cat = s.category || "uncategorized";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(s);
  }

  let out = "Load a specialized skill when the task at hand matches one of the skills listed below.\n\n";
  out += "The skill will inject detailed instructions into your context. Use it when you need domain-specific guidance.\n\n";
  out += 'Invoke this tool with `name` matching one of the skill names below (partial matches supported).\n\n';

  for (const [cat, items] of grouped) {
    out += `## ${cat}\n`;
    for (const s of items) {
      const tagStr = showTags && s.tags.length > 0 ? ` [${s.tags.join(", ")}]` : "";
      out += `- **${s.name}**: ${s.description}${tagStr}\n`;
    }
    out += "\n";
  }

  return out;
}

function matchSkill(skills: SkillEntry[], name: string): SkillEntry | undefined {
  const lower = name.toLowerCase();
  let best: SkillEntry | undefined;
  let bestScore = 0;

  for (const s of skills) {
    const sLower = s.name.toLowerCase();
    if (sLower === lower) return s;
    if (sLower.includes(lower) || lower.includes(sLower)) {
      const score = Math.min(sLower.length, lower.length);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
  }

  if (best) return best;

  for (const s of skills) {
    if (s.tags.some((t) => t.toLowerCase().includes(lower))) {
      return s;
    }
    if (s.description.toLowerCase().includes(lower)) {
      return s;
    }
  }

  return undefined;
}

export default async function SkillLoaderPlugin(ctx: any, options: SkillLoaderOptions = {}) {
  const {
    dirs: extraDirs = [],
    includeProjectSkills = true,
    defaultCategory = "uncategorized",
    showTags = true,
  } = options;

  const defaultDirs = [
    join(HOME, ".config", "opencode", "skills"),
    join(HOME, ".config", "opencode", "skill"),
  ];

  const projectSkillsDir = includeProjectSkills && ctx.directory
    ? join(ctx.directory, ".opencode", "skills")
    : "";

  const allDirs = [...defaultDirs, ...extraDirs, ...(projectSkillsDir ? [projectSkillsDir] : [])];

  const skills = await discoverSkills(allDirs, defaultCategory);
  const description = formatSkillList(skills, showTags);

  const skillTool = tool({
    description,
    args: {
      name: tool.schema.string().describe(
        "Name of the skill to load (partial match supported)",
      ),
    },
    async execute(args: { name: string }, _ctx: any) {
      const matched = matchSkill(skills, args.name);
      if (!matched) {
        const suggestions = skills
          .filter(
            (s) =>
              s.name
                .toLowerCase()
                .includes(args.name.toLowerCase().slice(0, 3)),
          )
          .slice(0, 5)
          .map((s) => s.name);
        const hint =
          suggestions.length > 0
            ? `\n\nSimilar skills: ${suggestions.join(", ")}`
            : `\n\nAvailable: ${skills.map((s) => s.name).join(", ")}`;
        return `Skill "${args.name}" not found.${hint}`;
      }

      return matched.content || `Skill "${matched.name}" loaded but has no body content.`;
    },
  });

  return {
    tool: { skill: skillTool },
  };
}
