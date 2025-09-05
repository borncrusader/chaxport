chrome.action.onClicked.addListener((tab) => {
    const allowedSites = ['claude.ai'];
    if (allowedSites.some(site => tab.url.includes(site))) {
        chrome.tabs.sendMessage(tab.id, {action: 'toggleExportView'}, function(response) {
            if (chrome.runtime.lastError) {
                console.log('Content script not ready:', chrome.runtime.lastError.message);
                return;
            }
            if (response && response.success) {
                console.log('Toggled export view');
            }
        });
    }
});