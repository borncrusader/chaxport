/**
 * Represents a single turn in the conversation
 */
export interface ConversationTurn {
  speaker: string;
  message: string;
}

/**
 * Represents a message with multiple formats
 */
export interface MessageData {
  text?: string;
  html: string;
  markdown: string;
}

/**
 * Main conversation content structure for JSON export
 */
export interface ConversationContent {
  date: string;
  title: string;
  participants: [string, string];
  blurb: string;
  tags: string[];
  dialog: ConversationTurn[];
}

/**
 * Internal state for content script
 */
export interface ContentScriptState {
  originalBodyContent: string | null;
  isExportView: boolean;
  isJsonView: boolean;
  escKeyHandler: ((event: KeyboardEvent) => void) | null;
}
