import { useEffect, useState } from 'react';
import { adminApi, aiApi } from '@/lib/adminApi';
import Icon from '@/components/ui/icon';

interface Listing {
  id: number;
  title: string;
  category: string;
  deal: string;
  price: number;
  area: number;
  address: string;
  district: string;
  city: string;
  status: string;
  description: string;
  image: string;
  tags: string[] | string;
  is_hot: boolean;
  is_new: boolean;
  owner_name: string | null;
  owner_phone: string | null;
  price_unit: 'm2' | 'sotka' | string;
  created_at: string;
  updated_at: string;
}

interface City {
  id: number;
  name: string;
  region: string | null;
  is_active: boolean;
}

const CATS = [
  ['office', 'Офис'],
  ['retail', 'Торговля'],
  ['warehouse', 'Склад'],
  ['restaurant', 'Ресторан'],
  ['business', 'Бизнес'],
  ['production', 'Производство'],
];
const DEALS: [string, string, string][] = [
  ['sale', 'Продажа', 'bg-emerald-100 text-emerald-700'],
  ['rent', 'Аренда', 'bg-blue-100 text-blue-700'],
  ['business', 'Готовый бизнес', 'bg-violet-100 text-violet-700'],
];

const empty: Partial<Listing> = {
  title: '', category: 'office', deal: 'sale', price: 0, area: 0,
  address: '', district: '', city: 'Краснодар', description: '', image: '', tags: '',
  status: 'active', is_hot: false, is_new: false,
  owner_name: '', owner_phone: '', price_unit: 'm2',
};

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const calcPerUnit = (price: number, area: number, unit: string) => {
  if (!price || !area) return 0;
  if (unit === 'sotka') return Math.round(price / (area / 100));
  return Math.round(price / area);
};

export default function ListingsAdmin() {
  const [items, setItems] = useState<Listing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editing, setEditing] = useState<Partial<Listing> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddCity, setShowAddCity] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityAdding, setCityAdding] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listListings(), adminApi.listCities()])
      .then(([l, c]) => {
        setItems(l.listings);
        setCities(c.cities.filter((x: City) => x.is_active));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    if (!editing) return;
    const data = { ...editing };
    if (Array.isArray(data.tags)) data.tags = data.tags.join(',');
    try {
      if (editing.id) await adminApi.updateListing(editing.id, data);
      else await adminApi.createListing(data);
      setEditing(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const archive = async (id: number) => {
    if (!confirm('Архивировать объект?')) return;
    await adminApi.archiveListing(id);
    load();
  };

  const aiDescribe = async () => {
    if (!editing) return;
    setAiLoading(true);
    try {
      const prompt = `Город: ${editing.city || 'Краснодар'}, категория: ${editing.category}, площадь: ${editing.area} м², адрес: ${editing.address || '-'}, цена: ${editing.price}, район: ${editing.district || '-'}, теги: ${editing.tags || '-'}`;
      const r = await aiApi.ask('describe', prompt);
      setEditing({ ...editing, description: r.text });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка ИИ');
    } finally {
      setAiLoading(false);
    }
  };

  const aiAddCity = async () => {
    if (!cityQuery.trim()) return;
    setCityAdding(true);
    try {
      const r = await aiApi.ask('add_city', cityQuery.trim());
      const text = r.text;
      if (text.startsWith('ERROR')) {
        alert('ИИ: ' + text);
        return;
      }
      const nameMatch = text.match(/ГОРОД:\s*(.+)/i);
      const regionMatch = text.match(/РЕГИОН:\s*(.+)/i);
      if (!nameMatch) {
        alert('ИИ не распознал город. Попробуйте уточнить.');
        return;
      }
      const name = nameMatch[1].trim();
      const region = regionMatch?.[1]?.trim() || '';
      await adminApi.createCity({ name, region });
      setCityQuery('');
      setShowAddCity(false);
      const c = await adminApi.listCities();
      setCities(c.cities.filter((x: City) => x.is_active));
      if (editing) setEditing({ ...editing, city: name });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCityAdding(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  const dealMeta = (d: string) => DEALS.find(x => x[0] === d);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Всего: {items.length}</div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="btn-blue text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
        >
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Фото</th>
              <th className="px-4 py-3">Объект</th>
              <th className="px-4 py-3">Сделка</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Собственник</th>
              <th className="px-4 py-3">Создан</th>
              <th className="px-4 py-3">Изменён</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const dm = dealMeta(it.deal);
              const unit = it.price_unit || 'm2';
              const perUnit = calcPerUnit(it.price, it.area, unit);
              return (
                <tr key={it.id} className="border-t border-border hover:bg-muted/30 align-top">
                  <td className="px-4 py-3">
                    {it.image ? (
                      <img src={it.image} alt={it.title}
                        className="w-16 h-16 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Icon name="Image" size={20} className="text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{it.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {it.city || 'Краснодар'}{it.district ? ` · ${it.district}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">{it.address}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{it.area} м²</div>
                  </td>
                  <td className="px-4 py-3">
                    {dm && (
                      <span className={`text-xs px-2 py-0.5 rounded ${dm[2]} font-semibold`}>
                        {dm[1]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold">{it.price.toLocaleString('ru')} ₽</div>
                    {perUnit > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {perUnit.toLocaleString('ru')} ₽/{unit === 'sotka' ? 'сот' : 'м²'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {it.owner_name && <div>{it.owner_name}</div>}
                    {it.owner_phone && (
                      <a href={`tel:${it.owner_phone}`} className="text-brand-blue hover:underline">
                        {it.owner_phone}
                      </a>
                    )}
                    {!it.owner_name && !it.owner_phone && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtDate(it.created_at)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtDate(it.updated_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${it.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {it.status === 'active' ? 'Активно' : 'Архив'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(it)} className="text-brand-blue hover:underline mr-3">
                      <Icon name="Pencil" size={16} />
                    </button>
                    <button onClick={() => archive(it.id)} className="text-red-600 hover:underline">
                      <Icon name="Archive" size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="font-display font-700 text-lg">
                {editing.id ? 'Редактировать' : 'Новый объект'}
              </div>
              <button onClick={() => setEditing(null)}><Icon name="X" size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Название"
                value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Категория</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}>
                    {CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Тип сделки</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={editing.deal}
                    onChange={e => setEditing({ ...editing, deal: e.target.value })}>
                    {DEALS.map(d => <option key={d[0]} value={d[0]}>{d[1]}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Цена, ₽</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg"
                    value={editing.price || ''} onChange={e => setEditing({ ...editing, price: +e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Площадь, м²</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg"
                    value={editing.area || ''} onChange={e => setEditing({ ...editing, area: +e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Единица цены</label>
                  <select className="w-full px-3 py-2 border rounded-lg" value={editing.price_unit || 'm2'}
                    onChange={e => setEditing({ ...editing, price_unit: e.target.value })}>
                    <option value="m2">за м²</option>
                    <option value="sotka">за сотку</option>
                  </select>
                </div>
              </div>

              {editing.price && editing.area ? (
                <div className="text-sm bg-muted/40 rounded-lg p-3">
                  Расчёт: <b>{calcPerUnit(+editing.price, +editing.area, editing.price_unit || 'm2').toLocaleString('ru')} ₽</b>
                  {' '}{editing.price_unit === 'sotka' ? 'за сотку' : 'за м²'}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs text-muted-foreground">Город</label>
                  <div className="flex gap-2">
                    <select className="flex-1 px-3 py-2 border rounded-lg" value={editing.city || 'Краснодар'}
                      onChange={e => setEditing({ ...editing, city: e.target.value })}>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddCity(true)}
                      title="Добавить город через ИИ"
                      className="px-3 rounded-lg bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange">
                      <Icon name="Sparkles" size={16} />
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-muted-foreground">Район</label>
                  <input className="w-full px-3 py-2 border rounded-lg"
                    value={editing.district || ''} onChange={e => setEditing({ ...editing, district: e.target.value })} />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-muted-foreground">Адрес</label>
                  <input className="w-full px-3 py-2 border rounded-lg"
                    value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Имя собственника</label>
                  <input className="w-full px-3 py-2 border rounded-lg"
                    value={editing.owner_name || ''} onChange={e => setEditing({ ...editing, owner_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Телефон собственника</label>
                  <input className="w-full px-3 py-2 border rounded-lg" placeholder="+7..."
                    value={editing.owner_phone || ''} onChange={e => setEditing({ ...editing, owner_phone: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">URL изображения</label>
                <input className="w-full px-3 py-2 border rounded-lg"
                  value={editing.image || ''} onChange={e => setEditing({ ...editing, image: e.target.value })} />
                {editing.image && (
                  <img src={editing.image} alt="preview"
                    className="mt-2 w-full max-w-xs h-40 object-cover rounded-lg border border-border" />
                )}
              </div>

              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Теги через запятую"
                value={typeof editing.tags === 'string' ? editing.tags : (editing.tags || []).join(',')}
                onChange={e => setEditing({ ...editing, tags: e.target.value })} />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Описание</label>
                  <button onClick={aiDescribe} disabled={aiLoading}
                    className="text-xs text-brand-orange hover:underline inline-flex items-center gap-1">
                    <Icon name="Sparkles" size={12} />
                    {aiLoading ? 'Генерация...' : 'Сгенерировать ИИ'}
                  </button>
                </div>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={4}
                  value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.is_hot}
                    onChange={e => setEditing({ ...editing, is_hot: e.target.checked })} />
                  Горячее
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.is_new}
                    onChange={e => setEditing({ ...editing, is_new: e.target.checked })} />
                  Новинка
                </label>
              </div>

              {editing.id && (
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  Создан: {fmtDate(editing.created_at as string)} ·
                  Обновлён: {fmtDate(editing.updated_at as string)}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm">Отмена</button>
              <button onClick={save} className="btn-blue text-white px-5 py-2 rounded-xl text-sm font-semibold">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCity && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="font-display font-700 text-lg inline-flex items-center gap-2">
                <Icon name="Sparkles" size={18} className="text-brand-orange" /> Добавить город
              </div>
              <button onClick={() => setShowAddCity(false)}><Icon name="X" size={20} /></button>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              Введите название — ИИ найдёт регион и добавит в список.
            </div>
            <input className="w-full px-3 py-2 border rounded-lg mb-3"
              placeholder="Например: Геленджик"
              value={cityQuery} onChange={e => setCityQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aiAddCity()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddCity(false)} className="px-4 py-2 rounded-xl text-sm">Отмена</button>
              <button onClick={aiAddCity} disabled={cityAdding || !cityQuery.trim()}
                className="btn-orange text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                <Icon name="Sparkles" size={14} />
                {cityAdding ? 'Добавляем...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
