import { z } from 'zod';

/**
 * Chat schemas for validating chat-related data.
 * These schemas are used to validate the structure and content of chat messages,
 * user IDs, room IDs, and message IDs.
 */

export const ChatSchemas = {
  createChatRoomBody: z.object({
    participantsIds: z
      .array(
        z.coerce
          .number()
          .int()
          .positive('Participant IDs must be positive numbers')
      )
      .min(1, 'At least one participant ID is required'),
  }),

  roomIdParam: z.object({
    roomId: z.string().cuid('Invalid room ID'),
  }),

  userIdParam: z.object({
    userId: z.coerce.number().int().positive('Invalid user ID'),
  }),

  messageBody: z.object({
    content: z.string().min(1, 'Message content is required'),
  }),

  messageIdParam: z.object({
    messageId: z.string().cuid('Invalid message ID'),
  }),

  editMessageBody: z.object({
    content: z.string().min(1, 'New message content required'),
  }),

  addUserToChatRoomParam: z.object({
    roomId: z.string().cuid('Invalid room ID'),
    userId: z.coerce.number().int().positive('Invalid user ID'),
  }),
  removeUserFromChatRoomParam: z.object({
    roomId: z.string().cuid('Invalid room ID'),
    userId: z.coerce.number().int().positive('Invalid user ID'),
  }),

};
