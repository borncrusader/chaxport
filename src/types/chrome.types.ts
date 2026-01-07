/**
 * Type-safe wrapper for chrome.tabs.query result
 */
export type ActiveTab = chrome.tabs.Tab & {
  id: number;
  url: string;
};

/**
 * Type guard to check if tab is valid active tab
 */
export function isActiveTab(tab: chrome.tabs.Tab): tab is ActiveTab {
  return typeof tab.id === 'number' && typeof tab.url === 'string';
}

/**
 * Type-safe message sender with response handling
 */
export interface MessageSender<TMessage, TResponse> {
  (tabId: number, message: TMessage): Promise<TResponse>;
}
