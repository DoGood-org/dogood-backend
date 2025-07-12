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
export interface EditMessagePayload {
  eventId: string;
  messageId: string;
  newContent: string;
}

export interface DeleteMessagePayload {
  eventId: string;
  messageId: string;
}

export interface TypingPayload {
  eventId: string;
  userId?: number;
}



export interface ChatSocketEvents {
  joinEventRoom: (payload: { eventId: string }) => void;
  leaveEventRoom: (payload: { eventId: string }) => void;
  sendMessage: (
    payload: { eventId: string; content: string },
    callback: (response: { error?: string; success?: boolean }) => void
  ) => void;
  editMessage: (payload: EditMessagePayload) => void;
  deleteMessage: (payload: DeleteMessagePayload) => void;
  reactToMessage: (payload: ReactionPayload) => void;
  typing: (payload: TypingPayload) => void;

  userJoined: (payload: { userId: number }) => void;
  userLeft: (payload: { eventId: string; userId: number }) => void;
  userTyping: (payload: { eventId: string; userId: number }) => void;
  userOnline: (payload: { userId: number }) => void;
  userOffline: (payload: { userId: number }) => void;

  newMessage: (payload: ChatMessagePayload) => void;
  messageEdited: (payload: { messageId: string; newContent: string }) => void;
  messageDeleted: (payload: { messageId: string }) => void;
  messageReacted: (payload: ReactionPayload) => void;
  error: (payload: { message: string }) => void;
}
