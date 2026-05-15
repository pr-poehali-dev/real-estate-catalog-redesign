import { useEffect, useState } from 'react';
import { adminApi, aiApi } from '@/lib/adminApi';
import Icon from '@/components/ui/icon';

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  listing_id: number | null;
  status: string;
  source: string;
  created_at: string;
}

interface Comment {
  id: number;
  author_name: string;
  comment: string;
  created_at: string;
}

const STATUSES = [
  ['new', 'Новый'],
  ['in_progress', 'В работе'],
  ['done', 'Закрыт'],
  ['rejected', 'Отказ'],
];

export default function LeadsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [active, setActive] = useState<Lead | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => adminApi.listLeads().then(d => setLeads(d.leads));
  useEffect(() => { load(); }, []);

  const openLead = async (l: Lead) => {
    setActive(l);
    setAiReply('');
    const d = await adminApi.getLead(l.id);
    setComments(d.comments || []);
  };

  const updateStatus = async (status: string) => {
    if (!active) return;
    await adminApi.updateLead(active.id, { status });
    setActive({ ...active, status });
    load();
  };

  const sendComment = async () => {
    if (!active || !comment.trim()) return;
    await adminApi.addLeadComment(active.id, comment);
    setComment('');
    const d = await adminApi.getLead(active.id);
    setComments(d.comments || []);
  };

  const generateReply = async () => {
    if (!active) return;
    setAiLoading(true);
    try {
      const r = await aiApi.ask('reply_lead',
        `Клиент: ${active.name}, телефон: ${active.phone}, сообщение: ${active.message || 'без сообщения'}`);
      setAiReply(r.text);
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : 'Ошибка'));
    } finally {
      setAiLoading(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      new: 'bg-emerald-100 text-emerald-700',
      in_progress: 'bg-blue-100 text-blue-700',
      done: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[s] || 'bg-muted';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border font-semibold">Заявки ({leads.length})</div>
        <div className="max-h-[70vh] overflow-y-auto">
          {leads.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Пока нет лидов</div>}
          {leads.map(l => (
            <button
              key={l.id}
              onClick={() => openLead(l)}
              className={`w-full text-left p-4 border-b border-border hover:bg-muted/40 transition ${
                active?.id === l.id ? 'bg-brand-blue/5' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="font-semibold text-sm">{l.name}</div>
                <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(l.status)}`}>
                  {STATUSES.find(s => s[0] === l.status)?.[1] || l.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{l.phone}</div>
              {l.message && <div className="text-xs mt-2 line-clamp-2">{l.message}</div>}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!active ? (
          <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground">
            <Icon name="Inbox" size={40} className="mx-auto mb-3 opacity-50" />
            Выберите заявку слева
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-display font-700 text-lg">{active.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <a href={`tel:${active.phone}`} className="text-brand-blue hover:underline">{active.phone}</a>
                    {active.email && <> · {active.email}</>}
                  </div>
                </div>
                <select
                  value={active.status}
                  onChange={e => updateStatus(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-sm"
                >
                  {STATUSES.map(s => <option key={s[0]} value={s[0]}>{s[1]}</option>)}
                </select>
              </div>
              {active.message && (
                <div className="mt-4 p-3 bg-muted/50 rounded-xl text-sm">{active.message}</div>
              )}
            </div>

            <div className="p-5 border-b border-border space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-sm">Черновик ответа клиенту</div>
                <button onClick={generateReply} disabled={aiLoading}
                  className="text-xs text-brand-orange hover:underline inline-flex items-center gap-1">
                  <Icon name="Sparkles" size={12} />
                  {aiLoading ? 'Генерация...' : 'Сгенерировать ИИ'}
                </button>
              </div>
              {aiReply && (
                <div className="p-3 bg-brand-orange/10 border border-brand-orange/30 rounded-xl text-sm whitespace-pre-wrap">
                  {aiReply}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="font-semibold text-sm mb-3">Комментарии</div>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="p-3 bg-muted/40 rounded-xl text-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      {c.author_name} · {new Date(c.created_at).toLocaleString('ru')}
                    </div>
                    {c.comment}
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-sm text-muted-foreground">Нет комментариев</div>
                )}
              </div>
              <div className="flex gap-2">
                <input value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Добавить комментарий..."
                  className="flex-1 px-3 py-2 border rounded-xl text-sm" />
                <button onClick={sendComment} className="btn-blue text-white px-4 rounded-xl">
                  <Icon name="Send" size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
