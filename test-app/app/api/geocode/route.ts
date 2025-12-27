import { NextRequest, NextResponse } from 'next/server';
import { Station } from '@/app/types';

export async function POST(request: NextRequest) {
  try {
    const { stationName, placeId } = await request.json();

    if (!stationName || typeof stationName !== 'string') {
      return NextResponse.json(
        { error: '駅名が必要です' },
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

    // place_idがある場合はPlace Detailsで取得
    if (placeId) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,geometry,formatted_address&language=ja&key=${apiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result) {
        const result = detailsData.result;
        const station: Station = {
          name: result.name || stationName,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          placeId: placeId,
          address: result.formatted_address,
        };
        return NextResponse.json({ station });
      }
    }

    // place_idがない場合はGeocodingで検索
    const query = stationName.includes('駅') ? stationName : `${stationName}駅`;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=jp&language=ja&key=${apiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
      return NextResponse.json(
        { error: `駅「${stationName}」が見つかりませんでした` },
        { status: 404 }
      );
    }

    const location = geocodeData.results[0].geometry.location;
    const station: Station = {
      name: geocodeData.results[0].name || stationName,
      latitude: location.lat,
      longitude: location.lng,
      placeId: geocodeData.results[0].place_id,
      address: geocodeData.results[0].formatted_address,
    };

    return NextResponse.json({ station });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: '駅の検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

