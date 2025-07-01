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

export interface ErrorPayload {
  message: string;
}

export interface ChatSocketEvents {
  joinEventRoom: (payload: { eventId: string }) => void;
  leaveEventRoom: (payload: { eventId: string }) => void;
  sendMessage: (payload: { eventId: string; content: string }) => void;
  editMessage: (payload: {
    eventId: string;
    messageId: string;
    newContent: string;
  }) => void;
  deleteMessage: (payload: { eventId: string; messageId: string }) => void;
  reactToMessage: (payload: ReactionPayload) => void;

  typing: (payload: { eventId: string }) => void;

  userJoined: (payload: { userId: number }) => void;
  userLeft: (payload: { eventId: string; userId: number }) => void;
  userTyping: (payload: { eventId: string; userId: number }) => void;

  newMessage: (payload: ChatMessagePayload) => void;
  messageEdited: (payload: { messageId: string; newContent: string }) => void;
  messageDeleted: (payload: { messageId: string }) => void;
  messageReacted: (payload: ReactionPayload) => void;

  error: (payload: { message: string }) => void;
}

// export interface ChatSocketEvents {
//   // Emitters
//   joinEventRoom: (payload: { eventId: string }) => void;
//   leaveEventRoom: (payload: { eventId: string }) => void;
//   sendMessage: (payload: { eventId: string; content: string }) => void;
//   editMessage: (payload: EditMessagePayload) => void;
//   deleteMessage: (payload: DeleteMessagePayload) => void;
//   reactToMessage: (payload: ReactionPayload) => void;
//   typing: (payload: TypingPayload) => void;
// 
//   // Listeners
//   userJoined: (payload: { userId: number }) => void;
//   userLeft: (payload: { eventId: string; userId: number }) => void;
//   userTyping: (payload: TypingPayload) => void;
// 
//   newMessage: (payload: ChatMessagePayload) => void;
//   messageEdited: (payload: EditMessagePayload) => void;
//   messageDeleted: (payload: DeleteMessagePayload) => void;
//   messageReacted: (payload: ReactionPayload) => void;
// 
//   error: (payload: ErrorPayload) => void;
// }