import { SearchUsersByNameRequestDtoV1 } from 'src/user/dtos/requests/v1/search-users-by-name-request.dto';

describe('SearchUsersByNameRequestDtoV1', () => {
  it.each([{}, { name: 'An' }])('should accept %p', (body) => {
    expect(SearchUsersByNameRequestDtoV1.schema.safeParse(body).success).toBe(
      true,
    );
  });

  it.each([{ name: '' }, { name: 42 }])('should reject %p', (body) => {
    expect(SearchUsersByNameRequestDtoV1.schema.safeParse(body).success).toBe(
      false,
    );
  });
});
