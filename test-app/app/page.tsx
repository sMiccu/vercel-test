'use client';

import { useState } from 'react';
import { Participant, NearbyStation } from './types';
import StationInput from './components/StationInput';
import MapModal from './components/MapModal';

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', stationName: '', stationPlaceId: undefined },
    { id: '2', stationName: '', stationPlaceId: undefined },
    { id: '3', stationName: '', stationPlaceId: undefined },
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NearbyStation[]>([]);
  const [originStations, setOriginStations] = useState<string[]>([]);
  const [centerPoint, setCenterPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedStation, setSelectedStation] = useState<NearbyStation | null>(null);
  const [showTransferLinks, setShowTransferLinks] = useState(false);
  const [showRestaurants, setShowRestaurants] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [restaurantType, setRestaurantType] = useState<string>('restaurant');
  const [minRating, setMinRating] = useState<number>(3.5);
  const [minReviews, setMinReviews] = useState<number>(0);
  const [maxPriceLevel, setMaxPriceLevel] = useState<number>(4);

  const addParticipant = () => {
    if (participants.length >= 5) return;
    setParticipants([
      ...participants,
      { id: Date.now().toString(), stationName: '', stationPlaceId: undefined },
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) return;
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const updateParticipant = (id: string, stationName: string, placeId?: string) => {
    setParticipants(
      participants.map((p) =>
        p.id === id ? { ...p, stationName, stationPlaceId: placeId } : p
      )
    );
  };

  const handleSearch = async () => {
    setError(null);
    setResults([]);

    // 入力チェック
    const validParticipants = participants.filter(
      (p) => p.stationName.trim() !== ''
    );
    if (validParticipants.length < 2) {
      setError('2人以上の参加者の駅名を入力してください');
      return;
    }

    setLoading(true);

    try {
      // 各参加者の駅名を座標に変換
      const stations = await Promise.all(
        validParticipants.map(async (participant) => {
          const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stationName: participant.stationName,
              placeId: participant.stationPlaceId,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '駅の検索に失敗しました');
          }

          const data = await response.json();
          return data.station;
        })
      );

      // 中心地点の駅を検索
      const searchResponse = await fetch('/api/find-center-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations }),
      });

      if (!searchResponse.ok) {
        const data = await searchResponse.json();
        throw new Error(data.error || '中心地点の検索に失敗しました');
      }

      const searchData = await searchResponse.json();
      setResults(searchData.stations || []);
      setCenterPoint(searchData.centerPoint || null);
      // 出発駅のリストを保存（NAVITIMEリンク用）
      setOriginStations(validParticipants.map(p => p.stationName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStationClick = (station: NearbyStation) => {
    setSelectedStation(station);
    setShowTransferLinks(true);
  };

  const generateNavitimeUrl = (origin: string, destination: string) => {
    return `https://www.navitime.co.jp/transfer/searchlist?orvStationName=${encodeURIComponent(origin)}&dnvStationName=${encodeURIComponent(destination)}&lang=ja`;
  };

  const handleShowRestaurants = async (station: NearbyStation) => {
    setSelectedStation(station);
    setShowRestaurants(true);
    setLoadingRestaurants(true);

    try {
      const response = await fetch('/api/nearby-restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: station.latitude,
          longitude: station.longitude,
          type: restaurantType,
          minRating: minRating,
          minReviews: minReviews,
          maxPriceLevel: maxPriceLevel,
        }),
      });

      const data = await response.json();
      setRestaurants(data.restaurants || []);
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
      setRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const getPriceLevelText = (level?: number) => {
    if (!level) return '不明';
    return '¥'.repeat(level);
  };

  const getGoogleMapsUrl = (placeId: string) => {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            中間地点駅検索
          </h1>
          <p className="text-gray-600">
            参加者全員の最寄り駅を入力して、中心地点の駅を見つけましょう
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            参加者の最寄り駅を入力
          </h2>

          <div className="space-y-4">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex gap-2 items-end">
                <StationInput
                  value={participant.stationName}
                  onChange={(value, placeId) => updateParticipant(participant.id, value, placeId)}
                  placeholder="例: 渋谷駅"
                  label={`参加者 ${index + 1}`}
                />
                {participants.length > 2 && (
                  <button
                    onClick={() => removeParticipant(participant.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>

          {participants.length < 5 && (
            <button
              onClick={addParticipant}
              className="mt-4 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              + 参加者を追加
            </button>
          )}

          {/* 飲食店検索条件 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              飲食店の検索条件
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリー
                </label>
                <select
                  value={restaurantType}
                  onChange={(e) => setRestaurantType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="restaurant">全般（レストラン）</option>
                  <option value="izakaya">🍶 居酒屋</option>
                  <option value="italian">🍝 イタリアン</option>
                  <option value="cafe">☕ カフェ</option>
                  <option value="japanese">🍱 和食</option>
                  <option value="chinese">🥟 中華</option>
                  <option value="korean">🍖 韓国料理</option>
                  <option value="french">🍷 フレンチ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最高価格帯
                </label>
                <select
                  value={maxPriceLevel}
                  onChange={(e) => setMaxPriceLevel(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="1">〜1000円</option>
                  <option value="2">〜3000円</option>
                  <option value="3">〜5000円</option>
                  <option value="4">5000円〜（上限なし）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低評価（★）
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="0">指定なし</option>
                  <option value="3.0">★3.0以上</option>
                  <option value="3.5">★3.5以上</option>
                  <option value="4.0">★4.0以上</option>
                  <option value="4.5">★4.5以上</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低レビュー数
                </label>
                <select
                  value={minReviews}
                  onChange={(e) => setMinReviews(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                >
                  <option value="0">指定なし</option>
                  <option value="5">5件以上</option>
                  <option value="10">10件以上</option>
                  <option value="20">20件以上</option>
                  <option value="50">50件以上</option>
                  <option value="100">100件以上</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '検索中...' : '中心地点の駅を検索'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  中心地点付近の駅一覧
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  中心地点から近い順に表示しています
                </p>
              </div>
              <button
                onClick={() => setShowMap(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                地図で確認
              </button>
            </div>
            <div className="space-y-3">
              {results.map((station, index) => (
                <div
                  key={station.placeId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-indigo-600">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {station.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          （中心地点から {station.distanceKm}km）
                        </span>
                      </div>
                      {station.address && (
                        <p className="text-sm text-gray-600 ml-7">
                          {station.address}
                        </p>
                      )}
                      <div className="mt-2 ml-7 flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleStationClick(station)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          🚃 乗換案内
                        </button>
                        <button
                          onClick={() => handleShowRestaurants(station)}
                          className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          🍽️ 周辺の飲食店
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {centerPoint && (
          <MapModal
            isOpen={showMap}
            onClose={() => setShowMap(false)}
            centerPoint={centerPoint}
            stations={results}
          />
        )}

        {/* 乗換案内リンクモーダル */}
        {showTransferLinks && selectedStation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedStation.name} への乗換案内
                </h2>
                <button
                  onClick={() => setShowTransferLinks(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                各参加者の最寄り駅から {selectedStation.name} への乗換案内（NAVITIME）を開きます
              </p>
              <div className="space-y-3">
                {originStations.map((origin, index) => (
                  <a
                    key={index}
                    href={generateNavitimeUrl(origin, selectedStation.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-500">参加者 {index + 1}</span>
                        <p className="font-semibold text-gray-900">
                          {origin} → {selectedStation.name}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 周辺飲食店モーダル */}
        {showRestaurants && selectedStation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
              <div className="sticky top-0 bg-white border-b p-4 rounded-t-lg">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedStation.name} 周辺の飲食店
                  </h2>
                  <button
                    onClick={() => setShowRestaurants(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                {/* モーダル内で条件変更 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      カテゴリー
                    </label>
                    <select
                      value={restaurantType}
                      onChange={(e) => {
                        setRestaurantType(e.target.value);
                        handleShowRestaurants(selectedStation);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="restaurant">全般</option>
                      <option value="izakaya">🍶 居酒屋</option>
                      <option value="italian">🍝 イタリアン</option>
                      <option value="cafe">☕ カフェ</option>
                      <option value="japanese">🍱 和食</option>
                      <option value="chinese">🥟 中華</option>
                      <option value="korean">🍖 韓国料理</option>
                      <option value="french">🍷 フレンチ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      最低評価
                    </label>
                    <select
                      value={minRating}
                      onChange={(e) => {
                        setMinRating(Number(e.target.value));
                        handleShowRestaurants(selectedStation);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="0">指定なし</option>
                      <option value="3.0">★3.0以上</option>
                      <option value="3.5">★3.5以上</option>
                      <option value="4.0">★4.0以上</option>
                      <option value="4.5">★4.5以上</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      最低レビュー
                    </label>
                    <select
                      value={minReviews}
                      onChange={(e) => {
                        setMinReviews(Number(e.target.value));
                        handleShowRestaurants(selectedStation);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="0">指定なし</option>
                      <option value="5">5件以上</option>
                      <option value="10">10件以上</option>
                      <option value="20">20件以上</option>
                      <option value="50">50件以上</option>
                      <option value="100">100件以上</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      最高価格帯
                    </label>
                    <select
                      value={maxPriceLevel}
                      onChange={(e) => {
                        setMaxPriceLevel(Number(e.target.value));
                        handleShowRestaurants(selectedStation);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                    >
                      <option value="1">〜1000円</option>
                      <option value="2">〜3000円</option>
                      <option value="3">〜5000円</option>
                      <option value="4">5000円〜</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {loadingRestaurants ? (
                  <div className="text-center py-8 text-gray-500">
                    検索中...
                  </div>
                ) : restaurants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    飲食店が見つかりませんでした
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {restaurants.map((restaurant) => (
                      <div
                        key={restaurant.placeId}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {restaurant.photoUrl && (
                          <img
                            src={restaurant.photoUrl}
                            alt={restaurant.name}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {restaurant.name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            {restaurant.rating && (
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                <span className="font-medium">{restaurant.rating}</span>
                                {restaurant.userRatingsTotal && (
                                  <span className="text-gray-500">
                                    ({restaurant.userRatingsTotal})
                                  </span>
                                )}
                              </div>
                            )}
                            {restaurant.priceLevel && (
                              <span className="text-gray-600">
                                {getPriceLevelText(restaurant.priceLevel)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {restaurant.vicinity}
                          </p>
                          <a
                            href={getGoogleMapsUrl(restaurant.placeId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Google Mapsで見る
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
