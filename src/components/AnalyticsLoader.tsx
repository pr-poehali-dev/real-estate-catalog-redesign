import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * Подгружает счётчики Яндекс.Метрики и Google Analytics
 * из настроек админки (yandex_metrika_id / google_analytics_id).
 * Безопасен к повторному монтированию — каждую систему загружает один раз.
 */
export default function AnalyticsLoader() {
  const { settings } = useSettings();
  const ymId = settings.yandex_metrika_id;
  const gaId = settings.google_analytics_id;

  // Яндекс.Метрика
  useEffect(() => {
    if (!ymId) return;
    const w = window as Window & { __ymLoaded?: Record<string, boolean> };
    w.__ymLoaded = w.__ymLoaded || {};
    if (w.__ymLoaded[ymId]) return;
    w.__ymLoaded[ymId] = true;

    const exists = Array.from(document.scripts).some(s => s.src.includes('mc.yandex.ru/metrika/tag.js'));
    if (!exists) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://mc.yandex.ru/metrika/tag.js';
      document.head.appendChild(s);
    }
    const init = () => {
      if (typeof window.ym !== 'function') {
        setTimeout(init, 200);
        return;
      }
      window.ym(Number(ymId), 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
        trackHash: true,
      });
    };
    init();
  }, [ymId]);

  // Google Analytics
  useEffect(() => {
    if (!gaId) return;
    const w = window as Window & { __gaLoaded?: Record<string, boolean> };
    w.__gaLoaded = w.__gaLoaded || {};
    if (w.__gaLoaded[gaId]) return;
    w.__gaLoaded[gaId] = true;

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => {
      (window.dataLayer as unknown[]).push(args);
    };
    window.gtag = gtag as typeof window.gtag;
    gtag('js', new Date());
    gtag('config', gaId);
  }, [gaId]);

  return null;
}