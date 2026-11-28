import { NotificationType } from '@prisma/client';
import { createNotificationSchemaV2 } from 'src/notification/dtos/generic/v2/create-notification.dto';
import { NOTIFICATION_CONTENT_LIMITS } from 'src/notification/interfaces/notification';
import { rejectionReasonSchema } from 'src/task/dtos/shared/rejection-reason.schema';

describe('rejectionReasonSchema', () => {
  const maxLength = NOTIFICATION_CONTENT_LIMITS.PARAM_VALUE_MAX_LENGTH;

  it('trims the value', () => {
    expect(rejectionReasonSchema.parse('  Spam  ')).toBe('Spam');
  });

  it.each(['', '   '])('rejects blank value %j', (value) => {
    expect(rejectionReasonSchema.safeParse(value).success).toBe(false);
  });

  it('accepts the max length and rejects one more character', () => {
    expect(rejectionReasonSchema.safeParse('a'.repeat(maxLength)).success).toBe(
      true,
    );
    expect(
      rejectionReasonSchema.safeParse('a'.repeat(maxLength + 1)).success,
    ).toBe(false);
  });

  it('rejects HTML tags but allows a bare "<"', () => {
    expect(rejectionReasonSchema.safeParse('<b>x</b>').success).toBe(false);
    expect(rejectionReasonSchema.safeParse('a < b').success).toBe(true);
  });

  it('accepts only values that the notification schema also accepts', () => {
    const reason = 'a'.repeat(maxLength);
    const notification = createNotificationSchemaV2.safeParse({
      userId: '6214bc53-5a33-46f4-a66a-821202085a67',
      type: NotificationType.TASK_REJECTED,
      params: { taskTitle: 'Title', rejectionReason: reason },
    });

    expect(rejectionReasonSchema.safeParse(reason).success).toBe(true);
    expect(notification.success).toBe(true);
  });
});
