// Discord markdown formatting parser
// Supports: bold, italic, bold italic, underline, strikethrough, code, code blocks, quotes, spoilers, and links

export function parseDiscordMarkdown(text: string): React.ReactNode {
  const escapeHtml = (str: string) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  // Split by lines for quote handling
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Handle >>> (multi-line quote)
    if (line.startsWith(">>>")) {
      const quoteContent: string[] = [];
      quoteContent.push(line.slice(3).trim());
      i++;
      while (i < lines.length && !lines[i].startsWith(">")) {
        quoteContent.push(lines[i]);
        i++;
      }
      elements.push(
        <div
          key={`quote-${elements.length}`}
          className="border-l-4 border-primary/50 pl-4 py-1 my-2 bg-primary/5 rounded"
        >
          {quoteContent.join("\n")}
        </div>
      );
      continue;
    }

    // Handle > (single-line quote)
    if (line.startsWith(">") && !line.startsWith(">>")) {
      elements.push(
        <div
          key={`quote-line-${elements.length}`}
          className="border-l-4 border-primary/30 pl-4 py-0.5 my-1 bg-primary/5"
        >
          {line.slice(1).trim()}
        </div>
      );
      i++;
      continue;
    }

    // Handle code blocks (triple backticks)
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // Skip closing ```
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-muted/50 border border-border rounded p-3 my-2 overflow-x-auto"
        >
          <code className="text-xs">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Process inline formatting for regular lines
    elements.push(
      <div key={`line-${elements.length}`}>
        {parseInlineMarkdown(line)}
      </div>
    );
    i++;
  }

  return elements;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partIndex = 0;

  while (remaining.length > 0) {
    // Find the next formatting marker
    const markers = [
      { pattern: "||", type: "spoiler" },
      { pattern: "***", type: "bold-italic" },
      { pattern: "**", type: "bold" },
      { pattern: "__", type: "underline" },
      { pattern: "~~", type: "strikethrough" },
      { pattern: "*", type: "italic" },
      { pattern: "_", type: "italic-alt" },
      { pattern: "`", type: "inline-code" },
    ];

    let nextMarker = { index: remaining.length, pattern: "", type: "" };

    for (const marker of markers) {
      const index = remaining.indexOf(marker.pattern);
      if (index !== -1 && index < nextMarker.index) {
        nextMarker = { index, pattern: marker.pattern, type: marker.type };
      }
    }

    // Check for links
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < nextMarker.index) {
      if (linkMatch.index > 0) {
        parts.push(
          <span key={`part-${partIndex++}`}>{remaining.slice(0, linkMatch.index)}</span>
        );
      }
      parts.push(
        <a
          key={`link-${partIndex++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
      continue;
    }

    if (nextMarker.index === remaining.length) {
      // No more markers, add remaining text
      if (remaining.length > 0) {
        parts.push(
          <span key={`part-${partIndex++}`}>{remaining}</span>
        );
      }
      break;
    }

    // Add text before marker
    if (nextMarker.index > 0) {
      parts.push(
        <span key={`part-${partIndex++}`}>{remaining.slice(0, nextMarker.index)}</span>
      );
    }

    remaining = remaining.slice(nextMarker.index + nextMarker.pattern.length);

    // Find closing marker
    const closingIndex = remaining.indexOf(nextMarker.pattern);
    if (closingIndex === -1) {
      // No closing marker, treat as literal
      parts.push(
        <span key={`part-${partIndex++}`}>{nextMarker.pattern}</span>
      );
      continue;
    }

    const content = remaining.slice(0, closingIndex);
    remaining = remaining.slice(closingIndex + nextMarker.pattern.length);

    // Apply formatting
    switch (nextMarker.type) {
      case "bold":
        parts.push(
          <strong key={`bold-${partIndex++}`}>{content}</strong>
        );
        break;
      case "italic":
      case "italic-alt":
        parts.push(
          <em key={`italic-${partIndex++}`}>{content}</em>
        );
        break;
      case "bold-italic":
        parts.push(
          <strong key={`bold-italic-${partIndex++}`}>
            <em>{content}</em>
          </strong>
        );
        break;
      case "underline":
        parts.push(
          <u key={`underline-${partIndex++}`}>{content}</u>
        );
        break;
      case "strikethrough":
        parts.push(
          <s key={`strikethrough-${partIndex++}`}>{content}</s>
        );
        break;
      case "inline-code":
        parts.push(
          <code
            key={`code-${partIndex++}`}
            className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono"
          >
            {content}
          </code>
        );
        break;
      case "spoiler":
        parts.push(
          <span
            key={`spoiler-${partIndex++}`}
            className="bg-foreground text-foreground cursor-pointer hover:bg-transparent hover:text-inherit transition-colors"
            onClick={(e) => {
              const el = e.currentTarget;
              el.classList.toggle("bg-transparent");
              el.classList.toggle("text-foreground");
            }}
          >
            {content}
          </span>
        );
        break;
    }
  }

  return parts;
}
