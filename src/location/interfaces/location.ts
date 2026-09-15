export interface LocationAddressInput {
  country: string;
  region: string;
  city: string;
}

export interface OwnerLocationInput extends LocationAddressInput {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ReverseGeocodeResult {
  country: string;
  region: string;
  city: string;
  displayName?: string;
}
