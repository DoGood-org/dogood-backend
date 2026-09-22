import { UpdateTaskRequestDtoV2 } from 'src/task/dtos/requests/v2/update-task-request.dto';

describe('UpdateTaskRequestDtoV2', () => {
  it('should accept an https image url', () => {
    expect(
      UpdateTaskRequestDtoV2.schema.safeParse({
        imageUrl: 'https://cdn.test/picture.png',
      }).success,
    ).toBe(true);
  });

  it('should reject an image url carrying a script-bearing protocol', () => {
    for (const imageUrl of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ]) {
      expect(
        UpdateTaskRequestDtoV2.schema.safeParse({ imageUrl }).success,
      ).toBe(false);
    }
  });

  it('should accept both coordinates as null to clear the location', () => {
    expect(
      UpdateTaskRequestDtoV2.schema.safeParse({
        latitude: null,
        longitude: null,
      }).success,
    ).toBe(true);
  });
});
