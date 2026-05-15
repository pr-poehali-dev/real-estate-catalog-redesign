import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

interface S {
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
}

export default function SettingsAdmin() {
  const [s, setS] = useState<Partial<S>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then(d => setS(d.settings || {}));
  }, []);

  const save = async () => {
    try {
      await adminApi.updateSettings(s as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : 'Ошибка'));
    }
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
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
        <div className="font-display font-700 text-lg mb-2">Компания</div>
        {field('company_name', 'Название')}
        {field('company_phone', 'Телефон')}
        {field('company_email', 'Email')}
        {field('company_address', 'Адрес')}
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
    </div>
  );
}
