import { NextRequest, NextResponse } from 'next/server';

export interface Restaurant {
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  vicinity: string;
  types: string[];
  placeId: string;
  photoUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, type, minRating, minReviews, maxPriceLevel } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: '座標が必要です' },
        { status: 400 }
      );
    }

    const filterMinRating = typeof minRating === 'number' ? minRating : 3.5;
    const filterMinReviews = typeof minReviews === 'number' ? minReviews : 0;
    const filterMaxPriceLevel = typeof maxPriceLevel === 'number' ? maxPriceLevel : 4;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // Places APIで周辺のレストランを検索
    const typeMap: { [key: string]: string } = {
      'restaurant': 'restaurant',
      'izakaya': 'bar',
      'cafe': 'cafe',
      'italian': 'restaurant',
      'japanese': 'restaurant',
      'chinese': 'restaurant',
      'korean': 'restaurant',
      'french': 'restaurant',
    };
    const typeParam = typeMap[type] || 'restaurant';

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=500&type=${typeParam}&language=ja&key=${apiKey}`;
    
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', placesData.status, placesData.error_message);
      return NextResponse.json({ restaurants: [] });
    }

    const restaurants: Restaurant[] = (placesData.results || [])
      .filter((place: any) => {
        const name = place.name || '';
        const rating = place.rating || 0;
        const reviewCount = place.user_ratings_total || 0;
        const priceLevel = place.price_level || 0;

        // 評価とレビュー数でフィルタ
        if (rating < filterMinRating || reviewCount < filterMinReviews) {
          return false;
        }

        // 価格帯でフィルタ
        if (priceLevel > 0 && priceLevel > filterMaxPriceLevel) {
          return false;
        }

        // カテゴリーでフィルタリング
        if (type === 'izakaya') {
          return name.includes('居酒屋') || place.types?.includes('bar') || place.types?.includes('night_club');
        } else if (type === 'italian') {
          return name.includes('イタリア') || name.includes('パスタ') || name.includes('ピザ');
        } else if (type === 'cafe') {
          return place.types?.includes('cafe') || name.includes('カフェ') || name.includes('喫茶');
        } else if (type === 'japanese') {
          return name.includes('和食') || name.includes('日本料理') || name.includes('寿司') || name.includes('天ぷら') || name.includes('うなぎ');
        } else if (type === 'chinese') {
          return name.includes('中華') || name.includes('中国料理') || name.includes('餃子') || name.includes('ラーメン');
        } else if (type === 'korean') {
          return name.includes('韓国') || name.includes('焼肉') || name.includes('サムギョプサル');
        } else if (type === 'french') {
          return name.includes('フレンチ') || name.includes('フランス料理') || name.includes('ビストロ');
        }
        return true; // restaurant（全般）
      })
      .slice(0, 12)
      .map((place: any) => {
        const restaurant: Restaurant = {
          name: place.name,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          priceLevel: place.price_level,
          vicinity: place.vicinity || '',
          types: place.types || [],
          placeId: place.place_id,
        };

        // 写真があれば取得
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          restaurant.photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
        }

        return restaurant;
      });

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Nearby restaurants error:', error);
    return NextResponse.json(
      { error: '飲食店の検索中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

