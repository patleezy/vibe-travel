'use client';
import { useEffect, useState } from 'react';
import { Destination } from '@/types';

interface Props {
  destinations: Destination[];
}

const SAFETY_COLORS: Record<string, string> = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
};

function makePinIcon(L: typeof import('leaflet'), color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px;
      height: 14px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.8);
      box-shadow: 0 0 6px ${color}99;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

export default function DestinationMap({ destinations }: Props) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet')['MapContainer'];
    TileLayer: typeof import('react-leaflet')['TileLayer'];
    Marker: typeof import('react-leaflet')['Marker'];
    Popup: typeof import('react-leaflet')['Popup'];
    L: typeof import('leaflet');
  } | null>(null);

  useEffect(() => {
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      // @ts-ignore
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl, L]) => {
      setMapComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
        L: L.default,
      });
    });
  }, []);

  const mapped = destinations.filter(d => d.lat != null && d.lng != null);
  if (!mapped.length || !MapComponents) return null;

  const { MapContainer, TileLayer, Marker, Popup, L } = MapComponents;

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
        <Marker
          key={i}
          position={[d.lat!, d.lng!]}
          icon={makePinIcon(L, SAFETY_COLORS[d.safetyStatus] ?? SAFETY_COLORS.green)}
        >
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
