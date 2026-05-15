import { useEffect, useState } from 'react';
import { adminApi, aiApi } from '@/lib/adminApi';
import Icon from '@/components/ui/icon';
import ListingsTable from './listings/ListingsTable';
import ListingEditor from './listings/ListingEditor';
import {
  Listing, City, Purpose, empty, detectVideoType, splitImages,
} from './listings/types';

export default function ListingsAdmin() {
  const [items, setItems] = useState<Listing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [editing, setEditing] = useState<Partial<Listing> | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listListings(), adminApi.listCities(), adminApi.listPurposes()])
      .then(([l, c, p]) => {
        setItems(l.listings);
        setCities(c.cities.filter((x: City) => x.is_active));
        setPurposes(p.purposes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEdit = (it?: Listing) => {
    if (it) {
      setEditing(it);
      const imgs = splitImages(it.images) ;
      if (!imgs.length && it.image) imgs.push(it.image);
      setPhotos(imgs);
    } else {
      setEditing({ ...empty });
      setPhotos([]);
    }
  };

  const save = async () => {
    if (!editing) return;
    const data: Record<string, unknown> = { ...editing };
    if (Array.isArray(data.tags)) data.tags = (data.tags as string[]).join(',');
    data.images = photos.join('|');
    data.image = photos[0] || '';
    if (data.video_url) data.video_type = detectVideoType(String(data.video_url));
    try {
      if (editing.id) await adminApi.updateListing(editing.id, data);
      else await adminApi.createListing(data);
      setEditing(null);
      setPhotos([]);
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
      const prompt = `Город: ${editing.city || 'Краснодар'}, категория: ${editing.category}, назначение: ${editing.purpose || '-'}, площадь: ${editing.area} м², адрес: ${editing.address || '-'}, цена: ${editing.price}`;
      const r = await aiApi.ask('describe', prompt);
      setEditing({ ...editing, description: r.text });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка ИИ');
    } finally {
      setAiLoading(false);
    }
  };

  const generateTags = async () => {
    if (!editing) return;
    setAiTagsLoading(true);
    try {
      const ctx = `Название: ${editing.title}, категория: ${editing.category}, назначение: ${editing.purpose || ''}, состояние: ${editing.condition || ''}, парковка: ${editing.parking || ''}, описание: ${editing.description || ''}`;
      const r = await aiApi.ask('auto_tags', ctx);
      setEditing({ ...editing, tags: r.text.replace(/\n/g, ',').replace(/\s+,/g, ',') });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setAiTagsLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Всего: {items.length}</div>
        <button onClick={() => openEdit()}
          className="btn-blue text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
          <Icon name="Plus" size={16} /> Добавить
        </button>
      </div>

      <ListingsTable items={items} onEdit={openEdit} onArchive={archive} />

      {editing && (
        <ListingEditor
          editing={editing}
          setEditing={setEditing}
          photos={photos}
          setPhotos={setPhotos}
          cities={cities}
          purposes={purposes}
          aiLoading={aiLoading}
          aiTagsLoading={aiTagsLoading}
          onDescribe={aiDescribe}
          onGenerateTags={generateTags}
          onClose={() => { setEditing(null); setPhotos([]); }}
          onSave={save}
        />
      )}
    </div>
  );
}
