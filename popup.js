const allowedSites = ['claude.ai'];

// Check if current tab is on an allowed site
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const isAllowed = allowedSites.some(site => currentTab.url.includes(site));

    if (isAllowed) {
        // Show the export button
        document.getElementById('supportedSite').classList.remove('hidden');

        // Check current state and update button text
        chrome.tabs.sendMessage(currentTab.id, {action: 'getState'}, function(response) {
            if (chrome.runtime.lastError) {
                // Content script not ready, button will show default "Print View"
                return;
            }
            if (response && response.isExportView) {
                document.getElementById('exportButton').textContent = 'Revert';
            } else {
                document.getElementById('exportButton').textContent = 'Print View';
            }
        });
    } else {
        // Show not supported message
        document.getElementById('notSupported').classList.remove('hidden');
    }
});

// Function to send message to content script
function sendToggleMessage(tabId) {
    chrome.tabs.sendMessage(tabId, {action: 'toggleExportView'}, function(response) {
        if (chrome.runtime.lastError) {
            // Content script not ready, inject it and try again
            console.log('Content script not ready, injecting...');
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Failed to inject content script:', chrome.runtime.lastError.message);
                    return;
                }
                // Try sending message again after injection
                chrome.tabs.sendMessage(tabId, {action: 'toggleExportView'}, function(response) {
                    if (response && response.success) {
                        console.log('Toggled export view');
                        window.close();
                    }
                });
            });
        } else if (response && response.success) {
            console.log('Toggled export view');
            window.close();
        }
    });
}

// Handle button click
document.getElementById('exportButton').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        sendToggleMessage(currentTab.id);
    });
});
