import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const input = searchParams.get('input');

    if (!input || input.trim() === '') {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // 入力に「駅」を補完
    const normalizedInput = input.includes('駅') ? input : `${input}駅`;
    
    // Autocomplete API（駅を優先的に取得）
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      normalizedInput
    )}&components=country:jp&language=ja&key=${apiKey}`;

    const response = await fetch(autocompleteUrl);
    const data = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      const predictions = Array.isArray(data.predictions) ? data.predictions : [];
      
      // 駅タイプを持つものを優先
      const stationTypeSet = new Set([
        'train_station',
        'subway_station',
        'transit_station',
        'light_rail_station'
      ]);

      // typesで駅と判定されるものを抽出
      const byStationType = predictions.filter((p: any) => {
        const types = Array.isArray(p?.types) ? p.types : [];
        return types.some((t: any) => stationTypeSet.has(t));
      });

      // typesで判定できない場合：descriptionに「駅」を含むもの
      const byNameHeuristic = predictions.filter((p: any) => {
        const types = Array.isArray(p?.types) ? p.types : [];
        const hasStationType = types.some((t: any) => stationTypeSet.has(t));
        if (hasStationType) return false;
        
        const desc = p?.description || '';
        const hasStation = desc.includes('駅');
        const excludeWords = ['店', '店舗', '支店', '営業所', 'ショッピング', 'モール', 'ビル', 'タワー'];
        const hasExcludeWord = excludeWords.some((w) => desc.includes(w));
        
        return hasStation && !hasExcludeWord;
      });

      const stationPredictions = [...byStationType, ...byNameHeuristic];

      return NextResponse.json({
        predictions: stationPredictions.slice(0, 10).map((p: any) => ({
          description: p.description,
          place_id: p.place_id,
          structured_formatting: p.structured_formatting,
        })),
      });
    } else {
      console.error('Autocomplete API error:', data.status, data.error_message);
      return NextResponse.json({ predictions: [] });
    }
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({ predictions: [] });
  }
}

