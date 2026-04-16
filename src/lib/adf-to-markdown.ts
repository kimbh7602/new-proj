// Convert Atlassian Document Format (ADF) to Markdown
// This file is shared between server and client — no Node.js APIs allowed.

export function adfToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  const attrs = (n.attrs || {}) as Record<string, unknown>;
  const content = (n.content || []) as unknown[];

  // --- Inline nodes ---

  if (n.type === "text") {
    let text = (n.text as string) || "";
    const marks = (n.marks || []) as Record<string, unknown>[];
    for (const mark of marks) {
      switch (mark.type) {
        case "strong":
          text = `**${text}**`;
          break;
        case "em":
          text = `*${text}*`;
          break;
        case "strike":
          text = `~~${text}~~`;
          break;
        case "code":
          text = `\`${text}\``;
          break;
        case "link": {
          const href = (mark.attrs as Record<string, string>)?.href || "";
          text = `[${text}](${href})`;
          break;
        }
        case "underline":
          text = `<u>${text}</u>`;
          break;
      }
    }
    return text;
  }

  if (n.type === "mention") {
    return `@${(attrs.text as string) || "unknown"}`;
  }

  if (n.type === "emoji") {
    return (attrs.shortName as string) || (attrs.text as string) || "";
  }

  if (n.type === "hardBreak") {
    return "\n";
  }

  if (n.type === "inlineCard") {
    const url = (attrs.url as string) || "";
    return `[${url}](${url})`;
  }

  // --- Block nodes ---

  if (n.type === "paragraph") {
    return content.map(adfToText).join("") + "\n\n";
  }

  if (n.type === "heading") {
    const level = (attrs.level as number) || 1;
    const text = content.map(adfToText).join("");
    return `${"#".repeat(level)} ${text}\n\n`;
  }

  if (n.type === "codeBlock") {
    const lang = (attrs.language as string) || "";
    const code = content.map(adfToText).join("");
    return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  }

  if (n.type === "blockquote") {
    const inner = content.map(adfToText).join("");
    return inner
      .split("\n")
      .map((line) => (line.trim() ? `> ${line}` : ">"))
      .join("\n") + "\n";
  }

  if (n.type === "rule") {
    return "---\n\n";
  }

  if (n.type === "bulletList") {
    return content
      .map((item) => {
        const text = adfToText(item).trim();
        return `- ${text}`;
      })
      .join("\n") + "\n\n";
  }

  if (n.type === "orderedList") {
    return content
      .map((item, i) => {
        const text = adfToText(item).trim();
        return `${i + 1}. ${text}`;
      })
      .join("\n") + "\n\n";
  }

  if (n.type === "listItem") {
    return content.map(adfToText).join("").trim();
  }

  // --- Table ---

  if (n.type === "table") {
    const rows = content.map(adfToText).filter(Boolean);
    if (rows.length === 0) return "";
    const firstRow = rows[0];
    const colCount = (firstRow.match(/\|/g) || []).length - 1;
    const separator = "|" + " --- |".repeat(colCount);
    return [rows[0], separator, ...rows.slice(1)].join("\n") + "\n\n";
  }

  if (n.type === "tableRow") {
    const cells = content.map(adfToText);
    return "| " + cells.join(" | ") + " |";
  }

  if (n.type === "tableHeader" || n.type === "tableCell") {
    return content.map(adfToText).join("").replace(/\n/g, " ").trim();
  }

  // --- Media ---

  if (n.type === "mediaGroup" || n.type === "mediaSingle") {
    return content.map(adfToText).join("");
  }

  if (n.type === "media") {
    const alt = (attrs.alt as string) || "image";
    const url = (attrs.url as string) || "";
    if (url) return `![${alt}](${url})\n`;
    return `[${alt}]\n`;
  }

  // --- Panels / Info boxes ---

  if (n.type === "panel") {
    const panelType = (attrs.panelType as string) || "info";
    const icon = panelType === "warning" ? "⚠️" : panelType === "error" ? "❌" : panelType === "success" ? "✅" : "ℹ️";
    const inner = content.map(adfToText).join("").trim();
    return `> ${icon} ${inner}\n\n`;
  }

  // --- Task list (checkboxes) ---

  if (n.type === "taskList") {
    return content.map(adfToText).join("\n") + "\n\n";
  }

  if (n.type === "taskItem") {
    const checked = (attrs.state as string) === "DONE";
    const text = content.map(adfToText).join("").trim();
    return `- [${checked ? "x" : " "}] ${text}`;
  }

  // --- Expand (collapsible) ---

  if (n.type === "expand" || n.type === "nestedExpand") {
    const title = (attrs.title as string) || "";
    const inner = content.map(adfToText).join("");
    return `**${title}**\n${inner}\n`;
  }

  // --- Decision ---

  if (n.type === "decisionList") {
    return content.map(adfToText).join("\n") + "\n\n";
  }

  if (n.type === "decisionItem") {
    const text = content.map(adfToText).join("").trim();
    return `🔹 ${text}`;
  }

  // --- Status lozenge ---

  if (n.type === "status") {
    const text = (attrs.text as string) || "";
    return `\`${text}\``;
  }

  // --- Date ---

  if (n.type === "date") {
    const ts = attrs.timestamp as string;
    if (ts) {
      const d = new Date(Number(ts));
      return d.toLocaleDateString("ko-KR");
    }
    return "";
  }

  // --- Fallback: recurse into content ---

  if (content.length > 0) {
    return content.map(adfToText).join("");
  }

  return "";
}
