console.log('Chaxport content script loaded on claude.ai');

let originalBodyContent = null;
let isExportView = false;
let isJsonView = false;
let escKeyHandler = null;

function htmlToMarkdown(html) {
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Function to process a node and its children
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const tag = node.tagName.toLowerCase();
        let content = '';

        // Process children
        for (let child of node.childNodes) {
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
                if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
                    return content;
                }
                return `\`${content}\``;

            case 'pre':
                return `\n\`\`\`\n${content}\n\`\`\`\n\n`;

            case 'a':
                const href = node.getAttribute('href') || '';
                return `[${content}](${href})`;

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
                return content + '\n';
            case 'ol':
                return content + '\n';
            case 'li':
                // Determine if parent is ul or ol
                const parentTag = node.parentElement?.tagName.toLowerCase();
                if (parentTag === 'ol') {
                    // For ordered lists, we'll use 1. for simplicity
                    return `1. ${content.trim()}\n`;
                } else {
                    return `- ${content.trim()}\n`;
                }

            case 'blockquote':
                const lines = content.trim().split('\n');
                return lines.map(line => `> ${line}`).join('\n') + '\n\n';

            case 'hr':
                return '\n---\n\n';

            case 'img':
                const alt = node.getAttribute('alt') || '';
                const src = node.getAttribute('src') || '';
                return `![${alt}](${src})`;

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

function getContent() {
    // Get title from header div.truncate
    const titleElement = document.querySelector('header div.truncate');
    const title = titleElement ? titleElement.textContent?.trim() : '';
    
    const conversation = [];
    
    // Get user messages
    const userMessages = [];
    document.querySelectorAll('[data-testid="user-message"]').forEach(userMsg => {
        const text = userMsg.textContent?.trim();
        const html = userMsg.innerHTML;
        if (text) {
            userMessages.push({
                text: text,
                html: html,
                markdown: htmlToMarkdown(html)
            });
        }
    });

    // Get AI responses - look for content inside font-claude-response divs
    const claudeMessages = [];
    document.querySelectorAll('.font-claude-response').forEach(response => {
        // Find the nested div containing paragraph elements
        const contentDiv = response.querySelector('div > div');
        if (contentDiv) {
            let html = contentDiv.innerHTML;
            if (html.trim()) {
                // Remove class attributes from div and p tags
                html = html.replace(/<(div|p)\s+[^>]*class="[^"]*"[^>]*>/g, '<$1>');
                html = html.replace(/<(div|p)\s+class="[^"]*"\s*>/g, '<$1>');
                claudeMessages.push({
                    html: html,
                    markdown: htmlToMarkdown(html)
                });
            }
        }
    });

    // Zip the arrays: human, claude, human, claude...
    const maxLength = Math.max(userMessages.length, claudeMessages.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < userMessages.length) {
            conversation.push({
                speaker: 'human',
                message: userMessages[i].markdown
            });
        }
        if (i < claudeMessages.length) {
            conversation.push({
                speaker: 'Claude',
                message: claudeMessages[i].markdown
            });
        }
    }

    // Remove the last message if the last two are both from Claude
    if (conversation.length >= 2 &&
        conversation[conversation.length - 1].speaker === 'Claude' &&
        conversation[conversation.length - 2].speaker === 'Claude') {
        conversation.pop();
    }

    // Get current date in YYYY-MM-dd format
    const today = new Date();
    const date = today.getFullYear() + '-' +
                 String(today.getMonth() + 1).padStart(2, '0') + '-' +
                 String(today.getDate()).padStart(2, '0');

    return {
        date: date,
        title: title,
        participants: ['Human', 'Claude'],
        blurb: '',
        tags: [],
        dialog: conversation
    };
}

function toggleExportView() {
    if (!isExportView) {
        // Store original content and show export view
        originalBodyContent = document.body.innerHTML;
        showExportView();
        isExportView = true;
        isJsonView = false;
    } else {
        // Restore original content
        if (originalBodyContent) {
            document.body.innerHTML = originalBodyContent;
            removeEscKeyListener();
            isExportView = false;
        }
    }
}

function toggleJsonView() {
    if (!isJsonView) {
        // Store original content and show JSON view
        originalBodyContent = document.body.innerHTML;
        showJsonView();
        isJsonView = true;
        isExportView = false;
    } else {
        // Restore original content
        if (originalBodyContent) {
            document.body.innerHTML = originalBodyContent;
            removeEscKeyListener();
            isJsonView = false;
        }
    }
}

function showExportView() {
    const content = getContent();
    
    // Create new body content
    const exportHTML = `
        <style>
            .conversation-turn p {
                margin: 12px 0;
            }
            .conversation-turn p:first-child {
                margin-top: 0;
            }
            .conversation-turn p:last-child {
                margin-bottom: 0;
            }
        </style>
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
            <h1 style="text-align: center; font-size: 2.5rem; border-bottom: 2px solid #eee; padding-bottom: 10px;">${content.title || 'Untitled Conversation'}</h1>
            ${content.dialog.map((turn, index) => `
                <div class="conversation-turn" style="margin: 20px 0; ${turn.speaker === 'human' ? 'margin-left: 0; margin-right: 10%;' : 'margin-left: 10%; margin-right: 0;'} width: 90%; padding: 15px; ${turn.speaker === 'human' ? 'border-left: 2px solid #3b82f6; border-top: 2px solid #3b82f6;' : 'border-right: 2px solid #10b981; border-bottom: 2px solid #10b981;'} background: transparent;">
                    <div style="font-weight: bold; color: ${turn.speaker === 'human' ? '#1e40af' : '#059669'}; margin-bottom: 8px;">
                        ${turn.speaker === 'human' ? 'Human' : turn.speaker}
                    </div>
                    <div>${turn.message}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.body.innerHTML = exportHTML;

    // Add Esc key listener to revert back to original DOM
    addEscKeyListener();
}

function showJsonView() {
    const content = getContent();

    // Function to get modified content with custom fields
    function getModifiedContent(humanName, aiModel, blurb, tags) {
        const modifiedContent = JSON.parse(JSON.stringify(content));

        // Update participants
        modifiedContent.participants = [humanName, aiModel];

        // Update blurb
        modifiedContent.blurb = blurb;

        // Update tags (parse CSV)
        modifiedContent.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        // Update speaker names in dialog
        modifiedContent.dialog.forEach(turn => {
            if (turn.speaker === 'human') {
                turn.speaker = humanName;
            } else if (turn.speaker === 'Claude') {
                turn.speaker = aiModel;
            }
        });

        return modifiedContent;
    }

    // Function to update display
    function updateDisplay() {
        const humanName = document.getElementById('humanPartyInput').value || 'Human';
        const aiModel = document.getElementById('aiModelInput').value || 'Claude';
        const blurb = document.getElementById('blurbInput').value || '';
        const tags = document.getElementById('tagsInput').value || '';
        const modifiedContent = getModifiedContent(humanName, aiModel, blurb, tags);
        document.getElementById('jsonDisplay').textContent = JSON.stringify(modifiedContent, null, 2);
    }

    // Create JSON display
    const jsonHTML = `
        <style>
            pre {
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 20px;
                overflow-x: auto;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                line-height: 1.6;
                color: #000;
            }
            .controls-container {
                margin-bottom: 20px;
            }
            .input-row {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                align-items: center;
            }
            .input-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .input-group.full-width {
                flex: 1;
            }
            .input-group label {
                font-size: 14px;
                font-weight: 500;
                color: white;
                white-space: nowrap;
            }
            .input-group input,
            .input-group textarea {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                font-family: system-ui, -apple-system, sans-serif;
            }
            .input-group input {
                width: 200px;
            }
            .input-group.full-width input,
            .input-group.full-width textarea {
                flex: 1;
                width: 100%;
            }
            .input-group textarea {
                resize: vertical;
                min-height: 60px;
            }
            .download-btn {
                background-color: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
            }
            .download-btn:hover {
                background-color: #2563eb;
            }
        </style>
        <div style="max-width: 1000px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
            <div class="controls-container">
                <div class="input-row">
                    <div class="input-group">
                        <label for="humanPartyInput">Human Party Name:</label>
                        <input type="text" id="humanPartyInput" value="Human" />
                    </div>
                    <div class="input-group">
                        <label for="aiModelInput">AI Model:</label>
                        <input type="text" id="aiModelInput" value="Claude" />
                    </div>
                    <button class="download-btn" id="downloadJsonBtn">Download JSON</button>
                </div>
                <div class="input-row">
                    <div class="input-group full-width">
                        <label for="blurbInput">Blurb:</label>
                        <textarea id="blurbInput" placeholder="Enter a description..."></textarea>
                    </div>
                </div>
                <div class="input-row">
                    <div class="input-group full-width">
                        <label for="tagsInput">Tags:</label>
                        <input type="text" id="tagsInput" placeholder="tag1, tag2, tag3" />
                    </div>
                </div>
            </div>
            <pre id="jsonDisplay">${JSON.stringify(getModifiedContent('Human', 'Claude', '', ''), null, 2)}</pre>
        </div>
    `;

    document.body.innerHTML = jsonHTML;

    // Update JSON display when any input changes
    document.getElementById('humanPartyInput').addEventListener('input', updateDisplay);
    document.getElementById('aiModelInput').addEventListener('input', updateDisplay);
    document.getElementById('blurbInput').addEventListener('input', updateDisplay);
    document.getElementById('tagsInput').addEventListener('input', updateDisplay);

    // Add download button handler
    document.getElementById('downloadJsonBtn').addEventListener('click', function() {
        const humanName = document.getElementById('humanPartyInput').value || 'Human';
        const aiModel = document.getElementById('aiModelInput').value || 'Claude';
        const blurb = document.getElementById('blurbInput').value || '';
        const tags = document.getElementById('tagsInput').value || '';
        const modifiedContent = getModifiedContent(humanName, aiModel, blurb, tags);
        downloadJson(modifiedContent);
    });

    // Add Esc key listener to revert back to original DOM
    addEscKeyListener();
}

function downloadJson(content) {
    const jsonStr = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Format filename: YYYY-MM-dd-title.json
    // Replace spaces with dashes, remove special characters, and lowercase
    const sanitizedTitle = (content.title || 'conversation')
        .toLowerCase()  // Convert to lowercase
        .replace(/\s+/g, '-')  // Replace spaces with dashes
        .replace(/['"`,;:!?()[\]{}]/g, '')  // Remove quotes and special characters
        .replace(/--+/g, '-')  // Replace multiple dashes with single dash
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing dashes

    a.download = `${content.date}-${sanitizedTitle}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function addEscKeyListener() {
    escKeyHandler = function(event) {
        if (event.key === 'Escape') {
            if (isExportView) {
                toggleExportView();
            } else if (isJsonView) {
                toggleJsonView();
            }
        }
    };
    document.addEventListener('keydown', escKeyHandler);
}

function removeEscKeyListener() {
    if (escKeyHandler) {
        document.removeEventListener('keydown', escKeyHandler);
        escKeyHandler = null;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleExportView') {
        toggleExportView();
        sendResponse({success: true});
    } else if (request.action === 'toggleJsonView') {
        toggleJsonView();
        sendResponse({success: true});
    } else if (request.action === 'getState') {
        sendResponse({isExportView: isExportView, isJsonView: isJsonView});
    }
    return true;
});

window.chaxport = {
    getContent: getContent,
};
