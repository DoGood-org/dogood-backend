import { ChatMemberParamsRequestDtoV1 } from 'src/chat/dtos/requests/v1/chat-member-params-request.dto';
import { ChatRoomParamsRequestDtoV1 } from 'src/chat/dtos/requests/v1/chat-room-params-request.dto';
import { CreateChatRoomRequestDtoV1 } from 'src/chat/dtos/requests/v1/create-chat-room-request.dto';

describe('chat v1 request DTOs', () => {
  const uuid = '0b6f7c1e-3f2a-4c5d-9e8f-1a2b3c4d5e6f';

  it.each(['1', 'ckx1234567890abcdefghijk', 'not-a-uuid'])(
    'should reject roomId %p',
    (roomId: string) => {
      expect(
        ChatRoomParamsRequestDtoV1.schema.safeParse({ roomId }).success,
      ).toBe(false);
      expect(
        ChatMemberParamsRequestDtoV1.schema.safeParse({ roomId, userId: uuid })
          .success,
      ).toBe(false);
    },
  );

  it('should accept uuid params', () => {
    expect(
      ChatMemberParamsRequestDtoV1.schema.safeParse({
        roomId: uuid,
        userId: uuid,
      }).success,
    ).toBe(true);
  });

  it('should reject a non-uuid userId', () => {
    expect(
      ChatMemberParamsRequestDtoV1.schema.safeParse({
        roomId: uuid,
        userId: '5',
      }).success,
    ).toBe(false);
  });

  it.each([[[]], [['5']], [[uuid, 7]]])(
    'should reject participantsIds %p',
    (participantsIds: unknown) => {
      expect(
        CreateChatRoomRequestDtoV1.schema.safeParse({ participantsIds })
          .success,
      ).toBe(false);
    },
  );

  it('should accept uuid participantsIds', () => {
    expect(
      CreateChatRoomRequestDtoV1.schema.safeParse({ participantsIds: [uuid] })
        .success,
    ).toBe(true);
  });
});
