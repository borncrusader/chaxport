/**
 * Message from popup to content script to toggle export view
 */
export interface ToggleExportViewMessage {
  action: 'toggleExportView';
}

/**
 * Message from popup to content script to toggle JSON view
 */
export interface ToggleJsonViewMessage {
  action: 'toggleJsonView';
}

/**
 * Message from popup to content script to get current state
 */
export interface GetStateMessage {
  action: 'getState';
}

/**
 * Union type of all possible messages
 */
export type ContentScriptMessage =
  | ToggleExportViewMessage
  | ToggleJsonViewMessage
  | GetStateMessage;

/**
 * Response from getState message
 */
export interface GetStateResponse {
  isExportView: boolean;
  isJsonView: boolean;
}

/**
 * Generic success response
 */
export interface SuccessResponse {
  success: boolean;
}

/**
 * Union type of all possible responses
 */
export type ContentScriptResponse =
  | SuccessResponse
  | GetStateResponse;
