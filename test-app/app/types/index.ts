export interface Station {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  address?: string;
}

export interface Participant {
  id: string;
  stationName: string;
  stationPlaceId?: string;
}

export interface NearbyStation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  distanceKm: number; // 中心点からの距離（km）
}

