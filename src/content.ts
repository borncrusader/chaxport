import type {
  ConversationContent,
  ConversationTurn,
  MessageData,
  ContentScriptState
} from './types/content.types';
import type {
  ContentScriptMessage,
  ContentScriptResponse,
  GetStateResponse,
  SuccessResponse
} from './types/messages.types';
import { htmlToMarkdown } from './utils/htmlToMarkdown';

console.log('Chaxport content script loaded on claude.ai');

// State management with explicit types
const state: ContentScriptState = {
  originalBodyContent: null,
  isExportView: false,
  isJsonView: false,
  escKeyHandler: null
};

/**
 * Extracts conversation content from the current Claude.ai page
 */
function getContent(): ConversationContent {
  // Get title from header div.truncate
  const titleElement = document.querySelector('header div.truncate');
  const title = titleElement?.textContent?.trim() ?? '';

  const conversation: ConversationTurn[] = [];

  // Get user messages
  const userMessages: MessageData[] = [];
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
  const claudeMessages: MessageData[] = [];
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

function toggleExportView(): void {
  if (!state.isExportView) {
    // Store original content and show export view
    state.originalBodyContent = document.body.innerHTML;
    showExportView();
    state.isExportView = true;
    state.isJsonView = false;
  } else {
    // Restore original content
    if (state.originalBodyContent) {
      document.body.innerHTML = state.originalBodyContent;
      removeEscKeyListener();
      state.isExportView = false;
    }
  }
}

function toggleJsonView(): void {
  if (!state.isJsonView) {
    // Store original content and show JSON view
    state.originalBodyContent = document.body.innerHTML;
    showJsonView();
    state.isJsonView = true;
    state.isExportView = false;
  } else {
    // Restore original content
    if (state.originalBodyContent) {
      document.body.innerHTML = state.originalBodyContent;
      removeEscKeyListener();
      state.isJsonView = false;
    }
  }
}

function showExportView(): void {
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
      ${content.dialog.map((turn) => `
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

function showJsonView(): void {
  const content = getContent();

  // Function to get modified content with custom fields
  function getModifiedContent(
    humanName: string,
    aiModel: string,
    blurb: string,
    tags: string
  ): ConversationContent {
    const modifiedContent: ConversationContent = JSON.parse(JSON.stringify(content));

    // Update participants
    modifiedContent.participants = [humanName, aiModel];

    // Update blurb
    modifiedContent.blurb = blurb;

    // Update tags (parse CSV)
    modifiedContent.tags = tags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

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
  function updateDisplay(): void {
    const humanNameInput = document.getElementById('humanPartyInput') as HTMLInputElement;
    const aiModelInput = document.getElementById('aiModelInput') as HTMLInputElement;
    const blurbInput = document.getElementById('blurbInput') as HTMLTextAreaElement;
    const tagsInput = document.getElementById('tagsInput') as HTMLInputElement;
    const jsonDisplay = document.getElementById('jsonDisplay');

    if (!jsonDisplay) return;

    const humanName = humanNameInput?.value ?? 'Human';
    const aiModel = aiModelInput?.value ?? 'Claude';
    const blurb = blurbInput?.value ?? '';
    const tags = tagsInput?.value ?? '';

    const modifiedContent = getModifiedContent(humanName, aiModel, blurb, tags);
    jsonDisplay.textContent = JSON.stringify(modifiedContent, null, 2);
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
  const humanInput = document.getElementById('humanPartyInput');
  const aiInput = document.getElementById('aiModelInput');
  const blurbInput = document.getElementById('blurbInput');
  const tagsInput = document.getElementById('tagsInput');
  const downloadBtn = document.getElementById('downloadJsonBtn');

  humanInput?.addEventListener('input', updateDisplay);
  aiInput?.addEventListener('input', updateDisplay);
  blurbInput?.addEventListener('input', updateDisplay);
  tagsInput?.addEventListener('input', updateDisplay);

  // Add download button handler
  downloadBtn?.addEventListener('click', () => {
    const humanNameInput = document.getElementById('humanPartyInput') as HTMLInputElement;
    const aiModelInput = document.getElementById('aiModelInput') as HTMLInputElement;
    const blurbInput = document.getElementById('blurbInput') as HTMLTextAreaElement;
    const tagsInput = document.getElementById('tagsInput') as HTMLInputElement;

    const humanName = humanNameInput?.value ?? 'Human';
    const aiModel = aiModelInput?.value ?? 'Claude';
    const blurb = blurbInput?.value ?? '';
    const tags = tagsInput?.value ?? '';

    const modifiedContent = getModifiedContent(humanName, aiModel, blurb, tags);
    downloadJson(modifiedContent);
  });

  // Add Esc key listener to revert back to original DOM
  addEscKeyListener();
}

function downloadJson(content: ConversationContent): void {
  const jsonStr = JSON.stringify(content, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Format filename: YYYY-MM-dd-title.json
  // Replace spaces with dashes, remove special characters, and lowercase
  const sanitizedTitle = (content.title || 'conversation')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/['"`,;:!?()[\]{}]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

  a.download = `${content.date}-${sanitizedTitle}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addEscKeyListener(): void {
  state.escKeyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (state.isExportView) {
        toggleExportView();
      } else if (state.isJsonView) {
        toggleJsonView();
      }
    }
  };
  document.addEventListener('keydown', state.escKeyHandler);
}

function removeEscKeyListener(): void {
  if (state.escKeyHandler) {
    document.removeEventListener('keydown', state.escKeyHandler);
    state.escKeyHandler = null;
  }
}

// Message listener with proper typing
chrome.runtime.onMessage.addListener(
  (
    request: ContentScriptMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ContentScriptResponse) => void
  ): boolean => {
    if (request.action === 'toggleExportView') {
      toggleExportView();
      sendResponse({ success: true } as SuccessResponse);
    } else if (request.action === 'toggleJsonView') {
      toggleJsonView();
      sendResponse({ success: true } as SuccessResponse);
    } else if (request.action === 'getState') {
      sendResponse({
        isExportView: state.isExportView,
        isJsonView: state.isJsonView
      } as GetStateResponse);
    }
    return true; // Keep message channel open for async response
  }
);

// Global API for debugging
declare global {
  interface Window {
    chaxport: {
      getContent: () => ConversationContent;
    };
  }
}

window.chaxport = {
  getContent
};
