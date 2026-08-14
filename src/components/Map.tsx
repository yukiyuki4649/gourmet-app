import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Restaurant } from '../types/restaurant';
import { MapCenter } from '../lib/appSettings';
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLibraries';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const UENO_CENTER: MapCenter = { lat: 35.7141, lng: 139.7774 };

interface MapProps {
  restaurants: Restaurant[];
  selectedId?: string | null;
  onSelectRestaurant?: (id: string) => void;
  isFiltered?: boolean;
  defaultCenter: MapCenter | null;
}

export function Map({ restaurants, selectedId, onSelectRestaurant, isFiltered, defaultCenter }: MapProps) {
  const [selectedMarker, setSelectedMarker] = useState<Restaurant | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const center = useMemo(() => {
    // Ueno is the default for first-time visitors who haven't set a personal
    // default center yet (src/lib/personalSettings.ts's defaultCenter is null
    // until they pick one on the settings page).
    if (defaultCenter) return defaultCenter;
    return UENO_CENTER;
  }, [defaultCenter]);

  useEffect(() => {
    if (!selectedId) return;
    const restaurant = restaurants.find(r => r.id === selectedId);
    if (!restaurant) return;
    setSelectedMarker(restaurant);
    mapRef.current?.panTo({ lat: restaurant.latitude, lng: restaurant.longitude });
  }, [selectedId, restaurants]);

  useEffect(() => {
    if (!isFiltered || !mapRef.current || restaurants.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    restaurants.forEach(r => bounds.extend({ lat: r.latitude, lng: r.longitude }));
    mapRef.current.fitBounds(bounds, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants, isFiltered]);

  if (!isLoaded) return <div className="h-64 sm:h-[500px]">読み込み中...</div>;

  return (
    <div className="h-64 sm:h-[500px]">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={map => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
      >
        {restaurants.map(restaurant => (
          <Marker
            key={restaurant.id}
            position={{
              lat: restaurant.latitude,
              lng: restaurant.longitude,
            }}
            onClick={() => {
              setSelectedMarker(restaurant);
              onSelectRestaurant?.(restaurant.id);
            }}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{
              lat: selectedMarker.latitude,
              lng: selectedMarker.longitude,
            }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2">
              <h3 className="font-bold">{selectedMarker.name}</h3>
              <p className="text-sm text-gray-600">{selectedMarker.cuisines.join('、')}</p>
              <p className="text-sm text-gray-600">総合評価: {selectedMarker.overallRating}</p>
              {selectedMarker.notes && <p className="text-sm mt-1">{selectedMarker.notes}</p>}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
