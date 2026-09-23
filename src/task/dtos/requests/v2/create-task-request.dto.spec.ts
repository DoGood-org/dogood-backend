import { CategoryType } from '@prisma/client';
import { CreateTaskRequestDtoV2 } from 'src/task/dtos/requests/v2/create-task-request.dto';

describe('CreateTaskRequestDtoV2', () => {
  const validRequest = {
    title: 'Clean park',
    description: 'Bring gloves',
    isOrganization: false,
    startDate: '2026-10-01T09:00:00.000Z',
    categories: [CategoryType.NATURE],
  };

  it('should accept an http and an https image url', () => {
    for (const imageUrl of [
      'http://cdn.test/picture.png',
      'https://cdn.test/picture.png',
    ]) {
      expect(
        CreateTaskRequestDtoV2.schema.safeParse({ ...validRequest, imageUrl })
          .success,
      ).toBe(true);
    }
  });

  it('should reject an image url carrying a script-bearing protocol', () => {
    for (const imageUrl of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
    ]) {
      expect(
        CreateTaskRequestDtoV2.schema.safeParse({ ...validRequest, imageUrl })
          .success,
      ).toBe(false);
    }
  });

  it('should require organizationId exactly when the host is an organization', () => {
    expect(
      CreateTaskRequestDtoV2.schema.safeParse({
        ...validRequest,
        isOrganization: true,
      }).success,
    ).toBe(false);
    expect(
      CreateTaskRequestDtoV2.schema.safeParse({
        ...validRequest,
        organizationId: '3f1a9f6e-1c4e-4a6b-9e2a-8d5c7b0a1234',
      }).success,
    ).toBe(false);
  });
});
