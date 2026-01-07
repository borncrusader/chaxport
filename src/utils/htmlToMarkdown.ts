/**
 * Converts HTML content to Markdown format
 *
 * Supports:
 * - Text formatting (bold, italic, code)
 * - Headings (h1-h6)
 * - Lists (ordered and unordered)
 * - Links and images
 * - Code blocks
 * - Blockquotes
 * - Tables (basic)
 *
 * @param html - HTML string to convert
 * @returns Markdown formatted string
 */
export function htmlToMarkdown(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    let content = '';

    // Process children
    for (const child of Array.from(element.childNodes)) {
      content += processNode(child);
    }

    // Convert based on tag type
    switch (tag) {
      case 'p':
      case 'div':
        return content + '\n\n';

      case 'br':
        return '\n';

      case 'strong':
      case 'b':
        return `**${content}**`;

      case 'em':
      case 'i':
        return `*${content}*`;

      case 'code':
        // Check if parent is a pre tag (code block) or inline code
        if (element.parentElement?.tagName.toLowerCase() === 'pre') {
          return content;
        }
        return `\`${content}\``;

      case 'pre':
        return `\n\`\`\`\n${content}\n\`\`\`\n\n`;

      case 'a': {
        const href = element.getAttribute('href') ?? '';
        return `[${content}](${href})`;
      }

      case 'h1':
        return `# ${content}\n\n`;
      case 'h2':
        return `## ${content}\n\n`;
      case 'h3':
        return `### ${content}\n\n`;
      case 'h4':
        return `#### ${content}\n\n`;
      case 'h5':
        return `##### ${content}\n\n`;
      case 'h6':
        return `###### ${content}\n\n`;

      case 'ul':
      case 'ol':
        return content + '\n';

      case 'li': {
        const parentTag = element.parentElement?.tagName.toLowerCase();
        if (parentTag === 'ol') {
          return `1. ${content.trim()}\n`;
        } else {
          return `- ${content.trim()}\n`;
        }
      }

      case 'blockquote': {
        const lines = content.trim().split('\n');
        return lines.map(line => `> ${line}`).join('\n') + '\n\n';
      }

      case 'hr':
        return '\n---\n\n';

      case 'img': {
        const alt = element.getAttribute('alt') ?? '';
        const src = element.getAttribute('src') ?? '';
        return `![${alt}](${src})`;
      }

      case 'table':
      case 'thead':
      case 'tbody':
      case 'tr':
      case 'td':
      case 'th':
        // Basic table support - just preserve content with spacing
        return content + ' ';

      default:
        return content;
    }
  }

  let markdown = processNode(temp);

  // Clean up excessive newlines (more than 2 consecutive)
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  markdown = markdown.trim();

  return markdown;
}
