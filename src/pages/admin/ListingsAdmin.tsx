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
  status: string;
  description: string;
  image: string;
  tags: string[] | string;
  is_hot: boolean;
  is_new: boolean;
}

const CATS = [
  ['office', 'Офис'],
  ['retail', 'Торговля'],
  ['warehouse', 'Склад'],
  ['restaurant', 'Ресторан'],
  ['business', 'Бизнес'],
  ['production', 'Производство'],
];
const DEALS = [
  ['sale', 'Продажа'],
  ['rent', 'Аренда'],
  ['business', 'Готовый бизнес'],
];

const empty: Partial<Listing> = {
  title: '', category: 'office', deal: 'sale', price: 0, area: 0,
  address: '', district: '', description: '', image: '', tags: '',
  status: 'active', is_hot: false, is_new: false,
};

export default function ListingsAdmin() {
  const [items, setItems] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Partial<Listing> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.listListings().then(d => setItems(d.listings)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    if (!editing) return;
    const data = { ...editing };
    if (Array.isArray(data.tags)) data.tags = data.tags.join(',');
    try {
      if (editing.id) {
        await adminApi.updateListing(editing.id, data);
      } else {
        await adminApi.createListing(data);
      }
      setEditing(null);
      load();
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : 'Ошибка'));
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
      const prompt = `Категория: ${editing.category}, площадь: ${editing.area} м², адрес: ${editing.address || '-'}, цена: ${editing.price}, район: ${editing.district || '-'}, теги: ${editing.tags || '-'}`;
      const r = await aiApi.ask('describe', prompt);
      setEditing({ ...editing, description: r.text });
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : 'Ошибка ИИ'));
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

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
              <th className="px-4 py-3">Объект</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Площадь</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.address}</div>
                </td>
                <td className="px-4 py-3">{CATS.find(c => c[0] === it.category)?.[1]}</td>
                <td className="px-4 py-3">{it.price.toLocaleString('ru')} ₽</td>
                <td className="px-4 py-3">{it.area} м²</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      it.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                    }`}
                  >
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
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex justify-between items-center sticky top-0 bg-white">
              <div className="font-display font-700 text-lg">
                {editing.id ? 'Редактировать' : 'Новый объект'}
              </div>
              <button onClick={() => setEditing(null)}>
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Название"
                value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="px-3 py-2 border rounded-lg" value={editing.category}
                  onChange={e => setEditing({ ...editing, category: e.target.value })}>
                  {CATS.map(c => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
                </select>
                <select className="px-3 py-2 border rounded-lg" value={editing.deal}
                  onChange={e => setEditing({ ...editing, deal: e.target.value })}>
                  {DEALS.map(d => <option key={d[0]} value={d[0]}>{d[1]}</option>)}
                </select>
                <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Цена"
                  value={editing.price || ''} onChange={e => setEditing({ ...editing, price: +e.target.value })} />
                <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Площадь м²"
                  value={editing.area || ''} onChange={e => setEditing({ ...editing, area: +e.target.value })} />
                <input className="px-3 py-2 border rounded-lg" placeholder="Адрес"
                  value={editing.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} />
                <input className="px-3 py-2 border rounded-lg" placeholder="Район"
                  value={editing.district || ''} onChange={e => setEditing({ ...editing, district: e.target.value })} />
              </div>
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="URL изображения"
                value={editing.image || ''} onChange={e => setEditing({ ...editing, image: e.target.value })} />
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
    </div>
  );
}
