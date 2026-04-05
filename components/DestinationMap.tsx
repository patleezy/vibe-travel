'use client';
import { useEffect, useState } from 'react';
import { Destination } from '@/types';

interface Props {
  destinations: Destination[];
}

export default function DestinationMap({ destinations }: Props) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet')['MapContainer'];
    TileLayer: typeof import('react-leaflet')['TileLayer'];
    Marker: typeof import('react-leaflet')['Marker'];
    Popup: typeof import('react-leaflet')['Popup'];
  } | null>(null);

  useEffect(() => {
    // Dynamically import Leaflet only on client to avoid SSR issues
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      // @ts-ignore
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl, L]) => {
      // Fix default marker icon broken by webpack bundling
      const DefaultIcon = L.default.icon({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });
      L.default.Marker.prototype.options.icon = DefaultIcon;

      setMapComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
      });
    });
  }, []);

  const mapped = destinations.filter(d => d.lat != null && d.lng != null);
  if (!mapped.length || !MapComponents) return null;

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  const avgLat = mapped.reduce((s, d) => s + d.lat!, 0) / mapped.length;
  const avgLng = mapped.reduce((s, d) => s + d.lng!, 0) / mapped.length;

  return (
    <MapContainer
      center={[avgLat, avgLng]}
      zoom={2}
      style={{ height: 280, width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
      />
      {mapped.map((d, i) => (
        <Marker key={i} position={[d.lat!, d.lng!]}>
          <Popup>
            <strong>{d.name}</strong><br />
            {d.country}<br />
            {d.vibeEmoji} {d.tagline}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
