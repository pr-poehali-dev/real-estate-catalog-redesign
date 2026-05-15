import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  title?: string;
  caption?: string;
  url?: string;
}

interface Props {
  /** Точки для отображения. Если только одна точка — карта центрируется на ней. */
  points?: MapPoint[];
  /** Принудительный центр карты [lat, lng]. По умолчанию — Краснодар. */
  center?: [number, number];
  /** Принудительный зум. */
  zoom?: number;
  /** Высота карты CSS-значением. */
  height?: string;
  /** Колбэк на клик по метке. */
  onPointClick?: (point: MapPoint) => void;
  className?: string;
}

const KRASNODAR: [number, number] = [45.0355, 38.9753];

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      Map: new (el: HTMLElement, opts: { center: [number, number]; zoom: number; controls?: string[] }) => YmapsMap;
      Placemark: new (coords: [number, number], props: Record<string, unknown>, opts?: Record<string, unknown>) => YmapsPlacemark;
      geocode?: (q: string) => Promise<{ geoObjects: { get: (i: number) => { geometry: { getCoordinates: () => [number, number] } } | null } }>;
    };
  }
}

interface YmapsMap {
  setCenter: (coords: [number, number], zoom?: number) => void;
  geoObjects: { add: (o: YmapsPlacemark) => void; removeAll: () => void };
  destroy: () => void;
}
interface YmapsPlacemark {
  events: { add: (e: string, cb: () => void) => void };
}

let loadingPromise: Promise<void> | null = null;

function loadYmapsScript(apiKey?: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.ymaps) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const key = apiKey ? `&apikey=${apiKey}` : '';
    s.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&load=package.full${key}`;
    s.async = true;
    s.onload = () => {
      window.ymaps!.ready(() => resolve());
    };
    s.onerror = () => {
      loadingPromise = null;
      reject(new Error('Не удалось загрузить Яндекс.Карты'));
    };
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export default function YandexMap({
  points = [],
  center,
  zoom = 11,
  height = '500px',
  onPointClick,
  className = '',
}: Props) {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YmapsMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = settings.yandex_maps_api_key || '';
    let cancelled = false;

    loadYmapsScript(apiKey).then(() => {
      if (cancelled || !containerRef.current || !window.ymaps) return;

      // Если уже создан — переиспользуем
      if (!mapRef.current) {
        const realCenter: [number, number] = center
          || (points[0] ? [points[0].lat, points[0].lng] : KRASNODAR);
        mapRef.current = new window.ymaps.Map(containerRef.current, {
          center: realCenter,
          zoom,
          controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
        });
      }
    }).catch(e => {
      if (!cancelled) setError(e.message || 'Ошибка карты');
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.yandex_maps_api_key]);

  // Обновление меток при изменении points
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.ymaps) return;
    map.geoObjects.removeAll();

    const valid = points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng));

    valid.forEach(p => {
      const placemark = new window.ymaps!.Placemark(
        [p.lat, p.lng],
        {
          balloonContentHeader: p.title || '',
          balloonContentBody: p.caption || '',
          hintContent: p.title || '',
        },
        { preset: 'islands#blueIcon' }
      );
      if (onPointClick || p.url) {
        placemark.events.add('click', () => {
          if (onPointClick) onPointClick(p);
          else if (p.url) window.location.assign(p.url);
        });
      }
      map.geoObjects.add(placemark);
    });

    if (valid.length === 1) {
      map.setCenter([valid[0].lat, valid[0].lng], Math.max(zoom, 14));
    } else if (center) {
      map.setCenter(center, zoom);
    }
  }, [points, center, zoom, onPointClick]);

  // Destroy on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch { /* ignore */ }
        mapRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`bg-muted rounded-xl flex items-center justify-center text-sm text-muted-foreground ${className}`}
           style={{ height }}>
        Карта временно недоступна
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height, width: '100%' }} className={`rounded-xl overflow-hidden ${className}`} />
  );
}
