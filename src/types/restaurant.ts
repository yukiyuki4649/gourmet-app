export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  overallRating: string;
  tasteRating: string;
  valuRating: string;
  notes: string;
  latitude: number;
  longitude: number;
  geocoded: boolean;
  geocodedAt?: Date;
}

export interface RestaurantInput {
  name: string;
  cuisine: string;
  area: string;
  overallRating: string;
  tasteRating: string;
  valuRating: string;
  notes: string;
}
