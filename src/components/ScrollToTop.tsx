import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Скроллит окно наверх при смене маршрута (pathname).
 * Не реагирует на смену query-параметров — чтобы фильтры в каталоге
 * не дёргали скролл. Если нужно — можно расширить deps до [pathname, search].
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
