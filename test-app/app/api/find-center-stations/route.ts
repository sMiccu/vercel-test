import { NextRequest, NextResponse } from 'next/server';
import { Station, NearbyStation } from '@/app/types';

// 2点間の距離を計算（Haversine formula、km単位）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const { stations } = await request.json();

    if (!stations || !Array.isArray(stations) || stations.length < 2) {
      return NextResponse.json(
        { error: '2つ以上の駅が必要です' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // 中間地点の座標を計算（重心）
    const centerLat = stations.reduce((sum: number, s: Station) => sum + s.latitude, 0) / stations.length;
    const centerLng = stations.reduce((sum: number, s: Station) => sum + s.longitude, 0) / stations.length;

    console.log('Center point:', { lat: centerLat, lng: centerLng });

    // 中間地点周辺の駅を検索（Places APIで「駅」を検索）
    const placesUrls = [
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=5000&type=subway_station&language=ja&key=${apiKey}`,
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=5000&type=train_station&language=ja&key=${apiKey}`,
    ];
    
    const allPlaces: any[] = [];
    const seenPlaceIds = new Set<string>();

    for (const placesUrl of placesUrls) {
      try {
        const placesResponse = await fetch(placesUrl);
        const placesData = await placesResponse.json();

        if (placesData.status === 'OK' && placesData.results) {
          for (const place of placesData.results) {
            if (!seenPlaceIds.has(place.place_id)) {
              seenPlaceIds.add(place.place_id);
              allPlaces.push(place);
            }
          }
        }
      } catch (error) {
        console.error('Places API fetch error:', error);
      }
    }

    console.log('Found stations:', allPlaces.length);

    // 駅一覧を作成（中心点からの距離順）
    const nearbyStations: NearbyStation[] = allPlaces.map((place) => {
      const lat = place.geometry.location.lat;
      const lng = place.geometry.location.lng;
      const distanceKm = calculateDistance(centerLat, centerLng, lat, lng);

      return {
        name: place.name,
        address: place.vicinity || '',
        latitude: lat,
        longitude: lng,
        placeId: place.place_id,
        distanceKm: Math.round(distanceKm * 100) / 100, // 小数点2桁
      };
    });

    // 距離順にソート
    nearbyStations.sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      centerPoint: {
        latitude: centerLat,
        longitude: centerLng,
      },
      stations: nearbyStations.slice(0, 3), // 上位3件
    });
  } catch (error) {
    console.error('Find center stations error:', error);
    return NextResponse.json(
      { error: '中心地点の駅検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

