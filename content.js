console.log('Chaxport content script loaded on claude.ai');

let originalBodyContent = null;
let isExportView = false;
let escKeyHandler = null;

function getContent() {
    // Get title from header div.truncate
    const titleElement = document.querySelector('header div.truncate');
    const title = titleElement ? titleElement.textContent?.trim() : '';
    
    const conversation = [];
    
    // Get user messages
    const userMessages = [];
    document.querySelectorAll('[data-testid="user-message"]').forEach(userMsg => {
        const text = userMsg.textContent?.trim();
        if (text) {
            userMessages.push(text);
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
                claudeMessages.push(html);
            }
        }
    });
    
    // Zip the arrays: human, claude, human, claude...
    const maxLength = Math.max(userMessages.length, claudeMessages.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < userMessages.length) {
            conversation.push({
                text: userMessages[i],
                party: 'human'
            });
        }
        if (i < claudeMessages.length) {
            conversation.push({
                text: claudeMessages[i],
                party: 'claude'
            });
        }
    }
    
    // Remove the last message if the last two are both from Claude
    if (conversation.length >= 2 && 
        conversation[conversation.length - 1].party === 'claude' && 
        conversation[conversation.length - 2].party === 'claude') {
        conversation.pop();
    }
    
    return {
        title: title,
        conversation: conversation
    };
}

function getAllVisibleText() {
    return document.body.textContent?.trim() || '';
}

function toggleExportView() {
    if (!isExportView) {
        // Store original content and show export view
        originalBodyContent = document.body.innerHTML;
        showExportView();
        isExportView = true;
    } else {
        // Restore original content
        if (originalBodyContent) {
            document.body.innerHTML = originalBodyContent;
            removeEscKeyListener();
            isExportView = false;
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
            ${content.conversation.map((turn, index) => `
                <div class="conversation-turn" style="margin: 20px 0; ${turn.party === 'human' ? 'margin-left: 0; margin-right: 10%;' : 'margin-left: 10%; margin-right: 0;'} width: 90%; padding: 15px; ${turn.party === 'human' ? 'border-left: 2px solid #3b82f6; border-top: 2px solid #3b82f6;' : 'border-right: 2px solid #10b981; border-bottom: 2px solid #10b981;'} background: transparent;">
                    <div style="font-weight: bold; color: ${turn.party === 'human' ? '#1e40af' : '#059669'}; margin-bottom: 8px;">
                        ${turn.party === 'human' ? 'Human' : 'Claude'}
                    </div>
                    <div>${turn.text}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.body.innerHTML = exportHTML;
    
    // Add Esc key listener to revert back to original DOM
    addEscKeyListener();
}

function addEscKeyListener() {
    escKeyHandler = function(event) {
        if (event.key === 'Escape' && isExportView) {
            toggleExportView();
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
    }
});

window.chaxport = {
    getContent: getContent,
    getAllVisibleText: getAllVisibleText
};