import { useRef, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapCenter } from '../lib/appSettings';
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLibraries';

const containerStyle = {
  width: '100%',
  height: '250px',
};

const FALLBACK_CENTER = { lat: 35.6762, lng: 139.6503 };

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  defaultCenter?: MapCenter | null;
}

export function LocationPicker({ latitude, longitude, onChange, defaultCenter }: LocationPickerProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [candidates, setCandidates] = useState<google.maps.places.PlaceResult[]>([]);

  const hasPosition = latitude !== 0 || longitude !== 0;
  const center = hasPosition ? { lat: latitude, lng: longitude } : defaultCenter ?? FALLBACK_CENTER;

  const applyResult = (result: google.maps.places.PlaceResult) => {
    const loc = result.geometry?.location;
    if (!loc) return;
    onChange(loc.lat(), loc.lng());
    mapRef.current?.panTo({ lat: loc.lat(), lng: loc.lng() });
    mapRef.current?.setZoom(16);
    setCandidates([]);
  };

  const handleSearch = () => {
    const query = searchText.trim();
    if (!query || !isLoaded) return;

    // Places Text Search understands business names directly (unlike the Geocoding API,
    // which is built for structured addresses and struggles with vague/partial store
    // names) — this is what actually makes fuzzy searches like "大黒屋" or a nickname
    // find the right place.
    if (!mapRef.current) {
      setSearchError('地図の読み込み中です。少し待ってから再度お試しください');
      return;
    }
    if (!placesServiceRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
    }

    setSearching(true);
    setSearchError('');
    setCandidates([]);

    // Bias toward the area the user is already working in (current pin, or their
    // default map center) so ambiguous/partial store names resolve to nearby matches
    // first — without this, a short name can match dozens of unrelated places anywhere
    // in Japan and the right one may not be the first result.
    const biasCenter = hasPosition ? { lat: latitude, lng: longitude } : defaultCenter;

    const request: google.maps.places.TextSearchRequest = {
      query,
      region: 'jp',
      location: biasCenter ? new window.google.maps.LatLng(biasCenter.lat, biasCenter.lng) : undefined,
      radius: biasCenter ? 20000 : undefined,
    };

    placesServiceRef.current.textSearch(request, (results, status) => {
      setSearching(false);
      const ok = window.google.maps.places.PlacesServiceStatus.OK;
      if (status === ok && results && results.length > 0) {
        if (results.length === 1) {
          applyResult(results[0]);
        } else {
          // Several plausible matches — let the user pick instead of silently
          // guessing wrong, which is what made ambiguous/vague searches feel broken.
          setCandidates(results.slice(0, 5));
        }
      } else {
        setSearchError('見つかりませんでした。別のキーワードで試すか、地図をクリックして指定してください');
      }
    });
  };

  return (
    <div>
      {/* Plain div, not <form> — this sits inside the surrounding add/edit <form>, and HTML
          doesn't allow nested forms (the button would submit the outer form instead). */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="店名で検索(例: 店名 エリア)"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !isLoaded}
          className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
        >
          {searching ? '検索中...' : '検索'}
        </button>
      </div>
      {searchError && <p className="text-xs text-red-600 mb-2">{searchError}</p>}

      {candidates.length > 0 && (
        <div className="mb-2 border border-gray-200 rounded-md divide-y">
          <p className="text-xs text-gray-500 px-2 py-1 bg-gray-50">候補が複数見つかりました。近いものを選んでください</p>
          {candidates.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyResult(result)}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50"
            >
              <span className="font-medium">{result.name}</span>
              {result.formatted_address && (
                <span className="block text-xs text-gray-500">{result.formatted_address}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">検索するか、地図をクリックして位置を設定してください</p>
        {hasPosition && (
          <p className="text-xs text-gray-400">
            緯度 {latitude.toFixed(4)} / 経度 {longitude.toFixed(4)}
          </p>
        )}
      </div>

      {!isLoaded ? (
        <div className="text-sm text-gray-500 py-8 text-center border border-gray-200 rounded-md">
          地図読み込み中...
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={hasPosition ? 15 : 12}
          options={{ clickableIcons: false }}
          onLoad={map => {
            mapRef.current = map;
          }}
          onClick={e => {
            if (!e.latLng) return;
            onChange(e.latLng.lat(), e.latLng.lng());
          }}
        >
          {hasPosition && <Marker position={{ lat: latitude, lng: longitude }} />}
        </GoogleMap>
      )}
    </div>
  );
}
