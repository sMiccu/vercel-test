'use client';

import { useEffect, useRef } from 'react';
import { NearbyStation } from '../types';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  centerPoint: { latitude: number; longitude: number };
  stations: NearbyStation[];
}

export default function MapModal({ isOpen, onClose, centerPoint, stations }: MapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInstanceRef.current) return;

    // Google Maps の初期化
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: centerPoint.latitude, lng: centerPoint.longitude },
      zoom: 13,
    });

    mapInstanceRef.current = map;

    // 中心地点のマーカー（赤）
    new google.maps.Marker({
      position: { lat: centerPoint.latitude, lng: centerPoint.longitude },
      map: map,
      title: '中心地点',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      },
      label: {
        text: '★',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
      },
    });

    // 候補駅のマーカー（青、番号付き）
    stations.forEach((station, index) => {
      const marker = new google.maps.Marker({
        position: { lat: station.latitude, lng: station.longitude },
        map: map,
        title: station.name,
        label: {
          text: `${index + 1}`,
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        },
      });

      // 情報ウィンドウ
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${station.name}</h3>
            <p style="font-size: 12px; color: #666;">中心地点から ${station.distanceKm}km</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });

    // 全マーカーが見えるように調整
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: centerPoint.latitude, lng: centerPoint.longitude });
    stations.forEach((station) => {
      bounds.extend({ lat: station.latitude, lng: station.longitude });
    });
    map.fitBounds(bounds);
  }, [isOpen, centerPoint, stations]);

  // モーダルを閉じたときにマップをリセット
  useEffect(() => {
    if (!isOpen) {
      mapInstanceRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">地図で確認</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <div className="mb-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-xl">★</span>
                <span>中心地点</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">1</span>
                <span>候補駅</span>
              </div>
            </div>
          </div>
          <div ref={mapRef} className="w-full h-[500px] rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

