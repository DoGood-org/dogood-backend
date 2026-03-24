export type ReverseGeocodeResult = {
  country: string;
  region: string;
  city: string;
  displayName?: string;
};

export type EnsureLocationInput = {
  country: string;
  region: string;
  city: string;
};