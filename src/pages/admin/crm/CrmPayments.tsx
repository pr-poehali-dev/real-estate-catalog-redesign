import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CRM_PAYMENTS_URL as PAYMENTS_URL, CRM_URL } from '@/lib/adminApi';

const PAYMENT_TYPES: { value: string; label: string }[] = [
  { value: 'service', label: 'Брокерское вознаграждение' },
  { value: 'deposit', label: 'Задаток' },
  { value: 'prepayment', label: 'Предоплата' },
  { value: 'other', label: 'Другое' },
];

const STATUS_INFO: Record<string, { label: string; cls: string; icon: string }> = {
  pending:   { label: 'Ожидает',  cls: 'bg-amber-100 text-amber-700',   icon: 'Clock' },
  succeeded: { label: 'Оплачено', cls: 'bg-green-100 text-green-700',   icon: 'CheckCircle2' },
  canceled:  { label: 'Отменён',  cls: 'bg-red-100 text-red-700',       icon: 'XCircle' },
  waiting_for_capture: { label: 'Удержан', cls: 'bg-blue-100 text-blue-700', icon: 'Pause' },
};

const REFUND_INFO: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Возврат: в обработке', cls: 'bg-amber-50 text-amber-600' },
  succeeded: { label: 'Возврат выполнен',      cls: 'bg-teal-50 text-teal-700' },
  canceled:  { label: 'Возврат отклонён',      cls: 'bg-red-50 text-red-600' },
};

interface Payment {
  id: number;
  deal_id?: number;
  deal_title?: string;
  owner_id?: number;
  owner_name?: string;
  amount: number;
  description?: string;
  payment_type?: string;
  buyer_email?: string;
  buyer_phone?: string;
  yookassa_payment_id?: string;
  yookassa_url?: string;
  status: string;
  refund_status?: string;
  created_at: string;
  creator?: string;
}

interface CreateForm {
  amount: string;
  description: string;
  payment_type: string;
  buyer_email: string;
  buyer_phone: string;
  deal_id: string;
  owner_id: string;
  return_url: string;
}

const EMPTY_FORM: CreateForm = {
  amount: '',
  description: '',
  payment_type: 'service',
  buyer_email: '',
  buyer_phone: '',
  deal_id: '',
  owner_id: '',
  return_url: typeof window !== 'undefined' ? window.location.origin + '/admin' : '',
};

export default function CrmPayments() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [refundId, setRefundId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': token || '' };

  const { data, isLoading } = useQuery({
    queryKey: ['crm-payments', page, filterType, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (filterType) params.set('payment_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      const r = await fetch(`${PAYMENTS_URL}/?${params}`, { headers });
      return r.json();
    },
  });

  const { data: owners = [] } = useQuery<{ id: number; name: string; phone: string }[]>({
    queryKey: ['crm-owners-list'],
    queryFn: async () => {
      const r = await fetch(`${CRM_URL}/owners?limit=100`, { headers });
      const d = await r.json();
      return d.owners || [];
    },
  });

  const { data: deals = [] } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['crm-deals-list'],
    queryFn: async () => {
      const r = await fetch(`${CRM_URL}/deals`, { headers });
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (f: CreateForm) => {
      const r = await fetch(`${PAYMENTS_URL}/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          ...f,
          amount: Number(f.amount),
          deal_id: f.deal_id ? Number(f.deal_id) : undefined,
          owner_id: f.owner_id ? Number(f.owner_id) : undefined,
          buyer_email: f.buyer_email || undefined,
          buyer_phone: f.buyer_phone || undefined,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Ошибка');
      return json;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['crm-payments'] });
      setCreatedUrl(res.payment_url || null);
      setForm(EMPTY_FORM);
      toast.success('Платёжная ссылка создана');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refundMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${PAYMENTS_URL}/${id}?action=refund`, {
        method: 'POST', headers, body: JSON.stringify({}),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Ошибка возврата');
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-payments'] });
      setRefundId(null);
      toast.success('Возврат инициирован');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkStatus = async (p: Payment) => {
    const r = await fetch(`${PAYMENTS_URL}/${p.id}`, { headers });
    const d = await r.json();
    qc.invalidateQueries({ queryKey: ['crm-payments'] });
    toast.info(`Статус: ${STATUS_INFO[d.payment?.status]?.label || d.payment?.status}`);
  };

  const copyLink = (url: string) => {
    navigator.clipboard?.writeText(url);
    toast.success('Ссылка скопирована в буфер');
  };

  const payments: Payment[] = data?.payments || [];
  const total: number = data?.total || 0;
  const totalPages = data?.pages || 1;

  const typeLabel = (t?: string) => PAYMENT_TYPES.find(x => x.value === t)?.label || t || '—';
  const fmtMoney = (n: number) => Number(n).toLocaleString('ru') + ' ₽';
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  // ── Экран с созданной ссылкой ────────────────────────────────────────
  if (createdUrl) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" size={28} className="text-green-600" />
        </div>
        <h2 className="text-xl font-display font-700">Платёжная ссылка создана</h2>
        <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-left break-all font-mono">
          {createdUrl}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="bg-brand-blue text-white" onClick={() => copyLink(createdUrl)}>
            <Icon name="Copy" size={15} className="mr-2" /> Скопировать ссылку
          </Button>
          <Button variant="outline" onClick={() => window.open(createdUrl, '_blank')}>
            <Icon name="ExternalLink" size={15} className="mr-2" /> Открыть
          </Button>
        </div>
        <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => setCreatedUrl(null)}>
          Вернуться к списку платежей
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-700">Платежи</h2>
          <p className="text-sm text-muted-foreground">Генерация ссылок ЮКассы · задаток и вознаграждение</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-brand-blue text-white">
          <Icon name="Plus" size={16} className="mr-2" />
          Создать платёж
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Все типы</option>
          {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </select>
        {(filterType || filterStatus) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType(''); setFilterStatus(''); }}>
            <Icon name="X" size={14} className="mr-1" /> Сбросить
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Icon name="Loader2" size={22} className="animate-spin mr-2" /> Загрузка...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Описание / Тип</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Покупатель</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Клиент / Сделка</th>
                <th className="text-right px-4 py-3 font-semibold">Сумма</th>
                <th className="text-center px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Платежей пока нет</td></tr>
              ) : payments.map(p => {
                const si = STATUS_INFO[p.status] || { label: p.status, cls: 'bg-muted text-foreground', icon: 'Circle' };
                const ri = p.refund_status ? REFUND_INFO[p.refund_status] : null;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="font-medium truncate">{p.description}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {typeLabel(p.payment_type)} · {fmtDate(p.created_at)}
                      </div>
                      {ri && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-1 inline-block ${ri.cls}`}>
                          {ri.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm">
                      {p.buyer_email && <div className="text-muted-foreground">{p.buyer_email}</div>}
                      {p.buyer_phone && <div className="text-muted-foreground">{p.buyer_phone}</div>}
                      {!p.buyer_email && !p.buyer_phone && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm">
                      {p.owner_name && <div>{p.owner_name}</div>}
                      {p.deal_title && <div className="text-xs text-muted-foreground truncate max-w-[140px]">{p.deal_title}</div>}
                      {!p.owner_name && !p.deal_title && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {fmtMoney(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${si.cls}`}>
                        <Icon name={si.icon} size={11} />
                        {si.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {p.yookassa_url && (
                          <button
                            title="Скопировать ссылку"
                            onClick={() => copyLink(p.yookassa_url!)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Icon name="Copy" size={14} />
                          </button>
                        )}
                        {p.yookassa_url && (
                          <button
                            title="Открыть ссылку"
                            onClick={() => setDetailId(p.id)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Icon name="ExternalLink" size={14} />
                          </button>
                        )}
                        {p.status === 'pending' && p.yookassa_payment_id && (
                          <button
                            title="Проверить статус"
                            onClick={() => checkStatus(p)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Icon name="RefreshCw" size={14} />
                          </button>
                        )}
                        {p.status === 'succeeded' && !p.refund_status && (
                          <button
                            title="Возврат"
                            onClick={() => setRefundId(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700"
                          >
                            <Icon name="Undo2" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Всего: {total}</span>
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <Icon name="ChevronLeft" size={15} />
                </Button>
                <span className="text-sm px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <Icon name="ChevronRight" size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Создать платёж ─────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый платёж</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Тип */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Тип платежа</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        payment_type: t.value,
                        description: f.description || t.label,
                      }));
                    }}
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold transition text-left ${
                      form.payment_type === t.value
                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                        : 'border-border hover:border-brand-blue/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Сумма */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Сумма (₽) *</label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="75 000"
              />
            </div>

            {/* Описание */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Описание</label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Брокерское вознаграждение по сделке..."
              />
            </div>

            {/* Покупатель */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email покупателя</label>
                <Input
                  type="email"
                  value={form.buyer_email}
                  onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))}
                  placeholder="buyer@mail.ru"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Телефон покупателя</label>
                <Input
                  type="tel"
                  value={form.buyer_phone}
                  onChange={e => setForm(f => ({ ...f, buyer_phone: e.target.value }))}
                  placeholder="+79001234567"
                />
              </div>
            </div>

            {/* Привязка */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Клиент (необязательно)</label>
                <select
                  value={form.owner_id}
                  onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">— Не привязывать —</option>
                  {(owners as { id: number; name: string; phone: string }[]).map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Сделка (необязательно)</label>
                <select
                  value={form.deal_id}
                  onChange={e => setForm(f => ({ ...f, deal_id: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">— Не привязывать —</option>
                  {(deals as { id: number; title: string }[]).map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* URL возврата */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">URL после оплаты</label>
              <Input
                value={form.return_url}
                onChange={e => setForm(f => ({ ...f, return_url: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-brand-blue text-white"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.amount}
              >
                {createMutation.isPending
                  ? <><Icon name="Loader2" size={15} className="animate-spin mr-2" />Создание...</>
                  : <><Icon name="Link" size={15} className="mr-2" />Создать ссылку</>
                }
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Детали платежа + ссылка ─────────────────────────────────────── */}
      {detailId !== null && (() => {
        const p = payments.find(x => x.id === detailId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-700 text-base">{p.description}</h3>
                <button onClick={() => setDetailId(null)} className="p-2 rounded-lg hover:bg-muted">
                  <Icon name="X" size={16} />
                </button>
              </div>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Сумма:</span> {fmtMoney(p.amount)}</div>
                <div><span className="text-muted-foreground">Тип:</span> {typeLabel(p.payment_type)}</div>
                {p.buyer_email && <div><span className="text-muted-foreground">Email:</span> {p.buyer_email}</div>}
                {p.buyer_phone && <div><span className="text-muted-foreground">Телефон:</span> {p.buyer_phone}</div>}
              </div>
              {p.yookassa_url && (
                <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs font-mono break-all">
                  {p.yookassa_url}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {p.yookassa_url && (
                  <>
                    <Button className="bg-brand-blue text-white" onClick={() => { copyLink(p.yookassa_url!); setDetailId(null); }}>
                      <Icon name="Copy" size={15} className="mr-2" /> Скопировать ссылку
                    </Button>
                    <Button variant="outline" onClick={() => window.open(p.yookassa_url, '_blank')}>
                      <Icon name="ExternalLink" size={15} className="mr-2" /> Открыть страницу оплаты
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => setDetailId(null)}>
                  Закрыть
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Подтверждение возврата ───────────────────────────────────────── */}
      {refundId !== null && (() => {
        const p = payments.find(x => x.id === refundId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Icon name="Undo2" size={18} className="text-red-600" />
                </div>
                <h3 className="font-display font-700">Возврат средств</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Вернуть <strong>{fmtMoney(p.amount)}</strong> покупателю? Это действие нельзя отменить.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => refundMutation.mutate(refundId)}
                  disabled={refundMutation.isPending}
                >
                  {refundMutation.isPending ? 'Выполняется...' : 'Подтвердить возврат'}
                </Button>
                <Button variant="outline" onClick={() => setRefundId(null)}>Отмена</Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
