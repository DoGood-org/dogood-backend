import { z } from 'zod';
import { HTML_TAG_PATTERN } from 'src/notification/dtos/generic/v2/create-notification.dto';
import { NOTIFICATION_CONTENT_LIMITS } from 'src/notification/interfaces/notification';

export const rejectionReasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(NOTIFICATION_CONTENT_LIMITS.PARAM_VALUE_MAX_LENGTH)
  .refine((value) => !HTML_TAG_PATTERN.test(value), {
    message: 'HTML tags are not allowed',
  });
