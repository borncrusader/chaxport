import type {
  ContentScriptMessage,
  ContentScriptResponse,
  GetStateResponse
} from './types/messages.types';

const ALLOWED_SITES = ['claude.ai'] as const;

/**
 * Checks if a URL is from an allowed site
 */
function isAllowedSite(url: string): boolean {
  return ALLOWED_SITES.some(site => url.includes(site));
}

/**
 * Gets DOM element by ID with type assertion
 */
function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Shows or hides an element
 */
function toggleVisibility(element: HTMLElement | null, visible: boolean): void {
  if (!element) return;
  if (visible) {
    element.classList.remove('hidden');
  } else {
    element.classList.add('hidden');
  }
}

/**
 * Type guard to check if tab is valid active tab
 */
function isValidActiveTab(tab: chrome.tabs.Tab): tab is chrome.tabs.Tab & { id: number; url: string } {
  return typeof tab.id === 'number' && typeof tab.url === 'string';
}

/**
 * Sends a message to the content script with proper error handling
 */
async function sendMessageToTab<TResponse extends ContentScriptResponse>(
  tabId: number,
  message: ContentScriptMessage
): Promise<TResponse | null> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: TResponse) => {
      if (chrome.runtime.lastError) {
        console.error('Message error:', chrome.runtime.lastError.message);
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Injects content script into a tab
 */
async function injectContentScript(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['content.js']
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to inject content script:', chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

/**
 * Sends toggle message to content script, injecting if needed
 */
async function sendToggleMessage(
  tabId: number,
  action: 'toggleExportView' | 'toggleJsonView'
): Promise<void> {
  const response = await sendMessageToTab(tabId, { action });

  if (!response) {
    // Content script not ready, inject it and try again
    console.log('Content script not ready, injecting...');
    const injected = await injectContentScript(tabId);

    if (!injected) return;

    const retryResponse = await sendMessageToTab(tabId, { action });
    if (retryResponse && 'success' in retryResponse && retryResponse.success) {
      console.log(`Toggled ${action}`);
      window.close();
    }
  } else if ('success' in response && response.success) {
    console.log(`Toggled ${action}`);
    window.close();
  }
}

/**
 * Initialize popup UI based on current tab
 */
async function initializePopup(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab || !isValidActiveTab(currentTab)) {
    console.error('No active tab found');
    return;
  }

  const supportedSite = getElement('supportedSite');
  const notSupported = getElement('notSupported');
  const viewOptions = getElement('viewOptions');
  const revertContainer = getElement('revertContainer');

  if (isAllowedSite(currentTab.url)) {
    toggleVisibility(supportedSite, true);
    toggleVisibility(notSupported, false);

    // Check current state
    const stateResponse = await sendMessageToTab<GetStateResponse>(
      currentTab.id,
      { action: 'getState' }
    );

    if (stateResponse) {
      const isInSpecialView = stateResponse.isExportView || stateResponse.isJsonView;
      toggleVisibility(viewOptions, !isInSpecialView);
      toggleVisibility(revertContainer, isInSpecialView);
    } else {
      // Default to showing view options
      toggleVisibility(viewOptions, true);
      toggleVisibility(revertContainer, false);
    }
  } else {
    toggleVisibility(supportedSite, false);
    toggleVisibility(notSupported, true);
  }
}

/**
 * Handle revert button click
 */
async function handleRevert(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab || !isValidActiveTab(currentTab)) return;

  const stateResponse = await sendMessageToTab<GetStateResponse>(
    currentTab.id,
    { action: 'getState' }
  );

  if (!stateResponse) return;

  if (stateResponse.isExportView) {
    await sendToggleMessage(currentTab.id, 'toggleExportView');
  } else if (stateResponse.isJsonView) {
    await sendToggleMessage(currentTab.id, 'toggleJsonView');
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initializePopup();

  const exportButton = getElement('exportButton');
  const jsonButton = getElement('jsonButton');
  const revertButton = getElement('revertButton');

  exportButton?.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && isValidActiveTab(currentTab)) {
      await sendToggleMessage(currentTab.id, 'toggleExportView');
    }
  });

  jsonButton?.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab && isValidActiveTab(currentTab)) {
      await sendToggleMessage(currentTab.id, 'toggleJsonView');
    }
  });

  revertButton?.addEventListener('click', handleRevert);
});
