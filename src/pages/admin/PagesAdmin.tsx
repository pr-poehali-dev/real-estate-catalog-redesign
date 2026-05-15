import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import Icon from '@/components/ui/icon';

interface P {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  published: boolean;
}

export default function PagesAdmin() {
  const [pages, setPages] = useState<P[]>([]);
  const [editing, setEditing] = useState<Partial<P> | null>(null);

  const load = () => adminApi.listPages().then(d => setPages(d.pages));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await adminApi.updatePage(editing.id, editing as Record<string, unknown>);
      } else {
        await adminApi.createPage(editing as Record<string, unknown>);
      }
      setEditing(null);
      load();
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : 'Ошибка'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing({ published: true })}
          className="btn-blue text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
          <Icon name="Plus" size={16} /> Новая страница
        </button>
      </div>

      <div className="grid gap-3">
        {pages.map(p => (
          <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm flex justify-between items-center">
            <div className="min-w-0">
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-muted-foreground">/{p.slug}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'}`}>
                {p.published ? 'Опубликована' : 'Черновик'}
              </span>
              <button onClick={() => setEditing(p)} className="text-brand-blue">
                <Icon name="Pencil" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex justify-between items-center sticky top-0 bg-white">
              <div className="font-display font-700 text-lg">
                {editing.id ? 'Редактировать страницу' : 'Новая страница'}
              </div>
              <button onClick={() => setEditing(null)}><Icon name="X" size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              {!editing.id && (
                <input className="w-full px-3 py-2 border rounded-lg" placeholder="URL slug (например, about)"
                  value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
              )}
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Заголовок"
                value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Meta description"
                value={editing.meta_description || ''} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} />
              <textarea className="w-full px-3 py-2 border rounded-lg" rows={12} placeholder="Контент страницы"
                value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.published}
                  onChange={e => setEditing({ ...editing, published: e.target.checked })} />
                Опубликована
              </label>
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
