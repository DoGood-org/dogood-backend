export interface LocationAddressData {
  country: string;
  region: string;
  city: string;
}

export interface OwnerLocationData extends LocationAddressData {
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
