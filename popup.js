const allowedSites = ['claude.ai'];

// Check if current tab is on an allowed site
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const isAllowed = allowedSites.some(site => currentTab.url.includes(site));

    if (isAllowed) {
        // Show the export button
        document.getElementById('supportedSite').classList.remove('hidden');

        // Check current state and show appropriate UI
        chrome.tabs.sendMessage(currentTab.id, {action: 'getState'}, function(response) {
            if (chrome.runtime.lastError) {
                // Content script not ready, show default view options
                return;
            }
            if (response) {
                if (response.isExportView || response.isJsonView) {
                    // Show revert button
                    document.getElementById('viewOptions').classList.add('hidden');
                    document.getElementById('revertContainer').classList.remove('hidden');
                } else {
                    // Show view options
                    document.getElementById('viewOptions').classList.remove('hidden');
                    document.getElementById('revertContainer').classList.add('hidden');
                }
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

// Function to send JSON toggle message to content script
function sendToggleJsonMessage(tabId) {
    chrome.tabs.sendMessage(tabId, {action: 'toggleJsonView'}, function(response) {
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
                chrome.tabs.sendMessage(tabId, {action: 'toggleJsonView'}, function(response) {
                    if (response && response.success) {
                        console.log('Toggled JSON view');
                        window.close();
                    }
                });
            });
        } else if (response && response.success) {
            console.log('Toggled JSON view');
            window.close();
        }
    });
}

// Handle Print View button click
document.getElementById('exportButton').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        sendToggleMessage(currentTab.id);
    });
});

// Handle JSON View button click
document.getElementById('jsonButton').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        sendToggleJsonMessage(currentTab.id);
    });
});

// Handle Revert button click
document.getElementById('revertButton').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];

        // Check which view is active and toggle it
        chrome.tabs.sendMessage(currentTab.id, {action: 'getState'}, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Failed to get state:', chrome.runtime.lastError.message);
                return;
            }
            if (response) {
                if (response.isExportView) {
                    sendToggleMessage(currentTab.id);
                } else if (response.isJsonView) {
                    sendToggleJsonMessage(currentTab.id);
                }
            }
        });
    });
});
