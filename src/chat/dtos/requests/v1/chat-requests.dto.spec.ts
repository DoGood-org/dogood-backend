import { ChatRoomParamsRequestDtoV1 } from 'src/chat/dtos/requests/v1/chat-room-params-request.dto';
import { GetMyChatRoomsRequestDtoV1 } from 'src/chat/dtos/requests/v1/get-my-chat-rooms-request.dto';
import { OpenDirectChatRequestDtoV1 } from 'src/chat/dtos/requests/v1/open-direct-chat-request.dto';
import { ReorderPinnedChatRoomsRequestDtoV1 } from 'src/chat/dtos/requests/v1/reorder-pinned-chat-rooms-request.dto';

describe('chat v1 request DTOs', () => {
  const uuid = '0b6f7c1e-3f2a-4c5d-9e8f-1a2b3c4d5e6f';
  const uuid2 = '1c7a8d2f-4a3b-4d6e-8f9a-2b3c4d5e6f70';

  it.each(['1', 'ckx1234567890abcdefghijk', 'not-a-uuid'])(
    'should reject roomId %p',
    (roomId: string) => {
      expect(
        ChatRoomParamsRequestDtoV1.schema.safeParse({ roomId }).success,
      ).toBe(false);
    },
  );

  it('should accept a uuid roomId', () => {
    expect(
      ChatRoomParamsRequestDtoV1.schema.safeParse({ roomId: uuid }).success,
    ).toBe(true);
  });

  it('should reject a non-uuid direct chat userId', () => {
    expect(
      OpenDirectChatRequestDtoV1.schema.safeParse({ userId: '5' }).success,
    ).toBe(false);
  });

  it('should trim search and accept a missing one', () => {
    expect(
      GetMyChatRoomsRequestDtoV1.schema.parse({ search: '  An ' }),
    ).toEqual({ search: 'An' });
    expect(GetMyChatRoomsRequestDtoV1.schema.parse({})).toEqual({});
  });

  it('should reject search longer than 100 characters', () => {
    expect(
      GetMyChatRoomsRequestDtoV1.schema.safeParse({ search: 'a'.repeat(101) })
        .success,
    ).toBe(false);
  });

  describe('reorder pinned rooms', () => {
    const roomIds = (count: number): string[] =>
      Array.from(
        { length: count },
        (_, index) => `0b6f7c1e-3f2a-4c5d-9e8f-1a2b3c4d5e6${index}`,
      );
    const isValid = (body: unknown): boolean =>
      ReorderPinnedChatRoomsRequestDtoV1.schema.safeParse(body).success;

    it.each([0, 1, 5])(
      'should accept %p distinct room ids',
      (count: number) => {
        expect(isValid({ roomIds: roomIds(count) })).toBe(true);
      },
    );

    it('should reject more room ids than the pin limit', () => {
      expect(isValid({ roomIds: roomIds(6) })).toBe(false);
    });

    it('should reject a room id given twice', () => {
      expect(isValid({ roomIds: [uuid, uuid2, uuid] })).toBe(false);
    });

    it('should reject a room id that is not a uuid', () => {
      expect(isValid({ roomIds: [uuid, '5'] })).toBe(false);
    });

    it.each([{}, { roomIds: null }, { roomIds: uuid }])(
      'should reject a body without a roomIds array: %p',
      (body: unknown) => {
        expect(isValid(body)).toBe(false);
      },
    );

    it('should keep the order the client sent', () => {
      expect(
        ReorderPinnedChatRoomsRequestDtoV1.schema.parse({
          roomIds: [uuid2, uuid],
        }),
      ).toEqual({ roomIds: [uuid2, uuid] });
    });
  });
});
