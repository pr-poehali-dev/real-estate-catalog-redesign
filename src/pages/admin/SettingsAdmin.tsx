import { useEffect, useState } from 'react';
import { adminApi, aiApi } from '@/lib/adminApi';
import { useSettings } from '@/contexts/SettingsContext';
import Icon from '@/components/ui/icon';

interface S {
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  logo_url: string;
  main_city: string;
}

interface City {
  id: number;
  name: string;
  region: string | null;
  is_active: boolean;
}

export default function SettingsAdmin() {
  const { reload } = useSettings();
  const [s, setS] = useState<Partial<S>>({});
  const [cities, setCities] = useState<City[]>([]);
  const [saved, setSaved] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityAdding, setCityAdding] = useState(false);

  const loadCities = () => adminApi.listCities().then(d => setCities(d.cities));

  useEffect(() => {
    adminApi.getSettings().then(d => setS(d.settings || {}));
    loadCities();
  }, []);

  const save = async () => {
    try {
      await adminApi.updateSettings(s as Record<string, unknown>);
      setSaved(true);
      await reload();
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const aiAddCity = async () => {
    if (!cityQuery.trim()) return;
    setCityAdding(true);
    try {
      const r = await aiApi.ask('add_city', cityQuery.trim());
      if (r.text.startsWith('ERROR')) {
        alert('ИИ: ' + r.text);
        return;
      }
      const nameMatch = r.text.match(/ГОРОД:\s*(.+)/i);
      const regionMatch = r.text.match(/РЕГИОН:\s*(.+)/i);
      if (!nameMatch) {
        alert('ИИ не распознал город');
        return;
      }
      await adminApi.createCity({ name: nameMatch[1].trim(), region: regionMatch?.[1]?.trim() || '' });
      setCityQuery('');
      loadCities();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCityAdding(false);
    }
  };

  const toggleCity = async (c: City) => {
    await adminApi.updateCity(c.id, { is_active: !c.is_active });
    loadCities();
  };

  const field = (key: keyof S, label: string, multiline = false) => (
    <div>
      <label className="text-sm font-semibold block mb-1">{label}</label>
      {multiline ? (
        <textarea className="w-full px-3 py-2 border rounded-lg" rows={3}
          value={s[key] || ''} onChange={e => setS({ ...s, [key]: e.target.value })} />
      ) : (
        <input className="w-full px-3 py-2 border rounded-lg"
          value={s[key] || ''} onChange={e => setS({ ...s, [key]: e.target.value })} />
      )}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
        <div className="font-display font-700 text-lg mb-2">Брендинг</div>
        <div>
          <label className="text-sm font-semibold block mb-1">URL логотипа</label>
          <input className="w-full px-3 py-2 border rounded-lg"
            placeholder="https://..."
            value={s.logo_url || ''} onChange={e => setS({ ...s, logo_url: e.target.value })} />
          {s.logo_url && (
            <div className="mt-2 p-3 bg-muted/40 rounded-lg inline-flex items-center gap-3">
              <img src={s.logo_url} alt="logo" className="h-10 w-10 object-contain" />
              <span className="text-xs text-muted-foreground">Предпросмотр</span>
            </div>
          )}
        </div>
        {field('company_name', 'Название компании')}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
        <div className="font-display font-700 text-lg mb-2">Контакты</div>
        {field('company_phone', 'Телефон')}
        {field('company_email', 'Email')}
        {field('company_address', 'Адрес')}
        <div>
          <label className="text-sm font-semibold block mb-1">Основной город</label>
          <select className="w-full px-3 py-2 border rounded-lg" value={s.main_city || 'Краснодар'}
            onChange={e => setS({ ...s, main_city: e.target.value })}>
            {cities.filter(c => c.is_active).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
        <div className="font-display font-700 text-lg mb-2">Главная страница</div>
        {field('hero_title', 'Заголовок Hero')}
        {field('hero_subtitle', 'Подзаголовок Hero', true)}
        {field('about_text', 'О компании', true)}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-blue text-white px-6 py-3 rounded-xl font-semibold">
          Сохранить
        </button>
        {saved && <span className="text-emerald-600 text-sm">Сохранено</span>}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="font-display font-700 text-lg mb-4">Города</div>

        <div className="flex gap-2 mb-4">
          <input className="flex-1 px-3 py-2 border rounded-lg text-sm"
            placeholder="Название нового города (например: Геленджик)"
            value={cityQuery} onChange={e => setCityQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && aiAddCity()} />
          <button onClick={aiAddCity} disabled={cityAdding || !cityQuery.trim()}
            className="btn-orange text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            <Icon name="Sparkles" size={14} />
            {cityAdding ? 'Добавляем...' : 'Добавить через ИИ'}
          </button>
        </div>

        <div className="space-y-2">
          {cities.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <div className="font-semibold">{c.name}</div>
                {c.region && <div className="text-xs text-muted-foreground">{c.region}</div>}
              </div>
              <button onClick={() => toggleCity(c)}
                className={`text-xs px-3 py-1 rounded-lg font-semibold ${
                  c.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-muted hover:bg-muted/70'
                }`}>
                {c.is_active ? 'Активен' : 'Скрыт'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}