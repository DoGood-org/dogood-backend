import { z } from 'zod';

/**
 * Chat schemas for validating chat-related data.
 * These schemas are used to validate the structure and content of chat messages,
 * user IDs, room IDs, and message IDs.
 */

export const ChatSchemas = {
  roomIdParam: z.object({
    id: z.string().cuid('Invalid room ID'),
  }),

  userIdParam: z.object({
    userId: z.coerce.number().int().positive('Invalid user ID'),
  }),

  messageBody: z.object({
    content: z.string().min(1, 'Message content is required'),
    senderId: z.coerce
      .number()
      .int()
      .positive('Sender ID must be a positive number'),
  }),

  messageIdParam: z.object({
    messageId: z.string().cuid('Invalid message ID'),
  }),

  editMessageBody: z.object({
    content: z.string().min(1, 'New message content required'),
  }),

 
};