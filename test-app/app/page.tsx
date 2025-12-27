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
  const [centerPoint, setCenterPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
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
      </div>
    </div>
  );
}
