'use client';

import { useState, useEffect, useRef } from 'react';

interface StationPrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface StationInputProps {
  value: string;
  onChange: (value: string, placeId?: string) => void;
  placeholder?: string;
  label?: string;
}

export default function StationInput({
  value,
  onChange,
  placeholder = '例: 渋谷駅',
  label,
}: StationInputProps) {
  const [predictions, setPredictions] = useState<StationPrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (value.trim().length < 2) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/autocomplete?input=${encodeURIComponent(value)}`
        );
        const data = await response.json();
        setPredictions(data.predictions || []);
      } catch (error) {
        console.error('Autocomplete fetch error:', error);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowPredictions(true);
  };

  const handleSelectPrediction = (prediction: StationPrediction) => {
    const stationName = prediction.structured_formatting?.main_text || prediction.description;
    onChange(stationName, prediction.place_id);
    setPredictions([]);
    setShowPredictions(false);
  };

  return (
    <div className="relative flex-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowPredictions(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
        autoComplete="off"
      />
      {showPredictions && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-2 text-left hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition-colors"
            >
              <div className="text-gray-900 font-medium">
                {prediction.structured_formatting?.main_text || prediction.description}
              </div>
              {prediction.structured_formatting?.secondary_text && (
                <div className="text-sm text-gray-500">
                  {prediction.structured_formatting.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {showPredictions && isLoading && value.trim().length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
          検索中...
        </div>
      )}
    </div>
  );
}

