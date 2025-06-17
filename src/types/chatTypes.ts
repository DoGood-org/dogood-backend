export interface ChatMessagePayload {
  eventId: string;
  messageId: string;
  content: string;
  timestamp: string;
  userId: number;
}

export interface ReactionPayload {
  eventId: string;
  messageId: string;
  reaction: string;
  userId: number;
}

export interface ChatSocketEvents {
  joinEventRoom: (eventId: string) => void;
  sendMessage: (eventId: string, message: string) => void;
  editMessage: (eventId: string, messageId: string, newContent: string) => void;
  deleteMessage: (eventId: string, messageId: string) => void;
  reactToMessage: (payload: ReactionPayload) => void;
  userJoined: (userId: number) => void;
  newMessage: (payload: ChatMessagePayload) => void;
  messageEdited: (messageId: string, newContent: string) => void;
  messageDeleted: (messageId: string) => void;
  messageReacted: (payload: ReactionPayload) => void;
  error: (message: string) => void;
  userTyping: (eventId: string, userId: number) => void;
  typing: (eventId: string) => void;
  userLeft: (eventId: string, userId: number) => void;
  leaveEventRoom: (eventId: string) => void;
}