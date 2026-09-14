import { NotificationType } from '@prisma/client';
import { z } from 'zod';
import {
  CreateNotificationV2,
  NOTIFICATION_CONTENT_LIMITS,
  NotificationContentV2,
} from 'src/notification/interfaces/notification';

const HTML_TAG_PATTERN = /<[^>]*>/;

const htmlFreeString = (maxLength: number): z.ZodString =>
  z
    .string()
    .max(maxLength)
    .refine((value) => !HTML_TAG_PATTERN.test(value), {
      message: 'HTML tags are not allowed',
    });

const hasAtMostKeys =
  (maxKeys: number) =>
  (record: Record<string, unknown>): boolean =>
    Object.keys(record).length <= maxKeys;

export const createNotificationSchemaV2: z.ZodType<CreateNotificationV2> =
  z.object({
    userId: z.uuid(),
    type: z.enum(NotificationType),
    params: z
      .record(
        z.string(),
        z.union([
          htmlFreeString(NOTIFICATION_CONTENT_LIMITS.PARAM_VALUE_MAX_LENGTH),
          z.number(),
        ]),
      )
      .refine(hasAtMostKeys(NOTIFICATION_CONTENT_LIMITS.PARAMS_MAX_KEYS), {
        message: 'Too many notification params',
      })
      .optional(),
    metadata: z
      .record(
        z.string(),
        z.union([
          htmlFreeString(NOTIFICATION_CONTENT_LIMITS.METADATA_VALUE_MAX_LENGTH),
          z.number(),
          z.boolean(),
          z.null(),
        ]),
      )
      .refine(hasAtMostKeys(NOTIFICATION_CONTENT_LIMITS.METADATA_MAX_KEYS), {
        message: 'Too many notification metadata keys',
      })
      .nullable()
      .optional(),
    relatedId: z.uuid().optional(),
    entityType: z
      .string()
      .max(NOTIFICATION_CONTENT_LIMITS.ENTITY_TYPE_MAX_LENGTH)
      .optional(),
  });

export const notificationContentSchemaV2: z.ZodType<NotificationContentV2> =
  z.object({
    title: htmlFreeString(NOTIFICATION_CONTENT_LIMITS.TITLE_MAX_LENGTH).min(1),
    body: htmlFreeString(NOTIFICATION_CONTENT_LIMITS.BODY_MAX_LENGTH).min(1),
  });
