import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useMemo, useState } from 'react';
import { Restaurant } from '../types/restaurant';

const containerStyle = {
  width: '100%',
  height: '500px',
};

interface MapProps {
  restaurants: Restaurant[];
}

export function Map({ restaurants }: MapProps) {
  const [selectedMarker, setSelectedMarker] = useState<Restaurant | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const center = useMemo(
    () =>
      restaurants.length > 0
        ? { lat: restaurants[0].latitude, lng: restaurants[0].longitude }
        : { lat: 35.6762, lng: 139.6503 },
    [restaurants],
  );

  if (!isLoaded) return <div>読み込み中...</div>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
      {restaurants.map(restaurant => (
        <Marker
          key={restaurant.id}
          position={{
            lat: restaurant.latitude,
            lng: restaurant.longitude,
          }}
          onClick={() => setSelectedMarker(restaurant)}
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
            <p className="text-sm text-gray-600">{selectedMarker.cuisine}</p>
            <p className="text-sm text-gray-600">総合評価: {selectedMarker.overallRating}</p>
            {selectedMarker.notes && <p className="text-sm mt-1">{selectedMarker.notes}</p>}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
