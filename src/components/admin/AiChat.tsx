import { useEffect, useRef, useState } from 'react';
import { aiApi, AiAction, AgentAction } from '@/lib/adminApi';
import Icon from '@/components/ui/icon';

interface AgentActionState extends AgentAction {
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  resultMessage?: string;
}

interface Msg {
  role: 'user' | 'ai';
  text: string;
  action?: AiAction;
  ts: number;
  suggestion?: Suggestion;
  status?: 'pending' | 'applied' | 'rejected';
  agentActions?: AgentActionState[];
  reasoning?: string;
}

interface Suggestion {
  kind: 'description' | 'seo' | 'reply' | 'tags' | 'analytics' | 'generic';
  before?: string;
  after: string;
}

interface Props {
  onClose: () => void;
  initialAction?: AiAction;
  initialPrompt?: string;
  contextData?: unknown;
  onResult?: (text: string) => void;
  onApply?: (text: string, kind: Suggestion['kind']) => void;
  title?: string;
  currentText?: string;
}

interface QuickCmd {
  id: string;
  label: string;
  icon: string;
  action: AiAction;
  prompt: string;
}

const QUICK_CMDS: QuickCmd[] = [
  { id: 'agent', label: 'Агент', icon: 'Bot', action: 'agent', prompt: 'Проанализируй текущее состояние каталога и лидов. Предложи самые важные действия, которые нужно выполнить прямо сейчас.' },
  { id: 'help', label: 'Помощь', icon: 'MessageCircle', action: 'admin', prompt: '' },
  { id: 'desc', label: 'Описание объекта', icon: 'PenLine', action: 'describe', prompt: '' },
  { id: 'reply', label: 'Ответ клиенту', icon: 'Mail', action: 'reply_lead', prompt: '' },
  { id: 'seo', label: 'SEO meta', icon: 'Search', action: 'seo', prompt: '' },
  { id: 'tags', label: 'Авто-теги', icon: 'Tags', action: 'auto_tags', prompt: '' },
  { id: 'moderate', label: 'Модерация', icon: 'CheckCircle2', action: 'moderate', prompt: '' },
  { id: 'analytics', label: 'Сводка', icon: 'BarChart3', action: 'analytics', prompt: 'Дай краткую сводку и 2-3 рекомендации по работе с каталогом.' },
  { id: 'seo-audit', label: 'SEO-аудит', icon: 'Gauge', action: 'admin', prompt: 'Проведи SEO-аудит: проверь, какие моменты в каталоге могут влиять на индексацию (мета-теги, alt-теги, дубли заголовков). Дай чек-лист исправлений.' },
];

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  update_listing: { label: 'Обновить объект', icon: 'Pencil' },
  archive_listing: { label: 'В архив', icon: 'Archive' },
  delete_listing: { label: 'Удалить объект', icon: 'Trash2' },
  reply_lead: { label: 'Ответить клиенту', icon: 'Send' },
  close_lead: { label: 'Закрыть лид', icon: 'CheckCircle2' },
  generate_description: { label: 'Переписать описание', icon: 'PenLine' },
  note: { label: 'Совет', icon: 'Lightbulb' },
};

const RISK_STYLES: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const HISTORY_KEY = 'biznest_ai_chat_history';
const HISTORY_LIMIT = 50;

function detectSuggestion(text: string, action?: AiAction, currentText?: string): Suggestion | undefined {
  if (!text) return undefined;
  const cleanedText = text.trim();
  if (action === 'describe') return { kind: 'description', before: currentText, after: cleanedText };
  if (action === 'reply_lead') return { kind: 'reply', after: cleanedText };
  if (action === 'seo') return { kind: 'seo', after: cleanedText };
  if (action === 'auto_tags') return { kind: 'tags', after: cleanedText };
  if (action === 'analytics') return { kind: 'analytics', after: cleanedText };
  if (action === 'moderate') return { kind: 'generic', after: cleanedText };
  return undefined;
}

function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Msg[];
    return Array.isArray(arr) ? arr.slice(-HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveHistory(msgs: Msg[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-HISTORY_LIMIT)));
  } catch {
    // ignore quota
  }
}

export default function AiChat({
  onClose,
  initialAction = 'admin',
  initialPrompt = '',
  contextData,
  onResult,
  onApply,
  title,
  currentText,
}: Props) {
  const [action, setAction] = useState<AiAction>(initialAction);
  const [input, setInput] = useState(initialPrompt);
  const [messages, setMessages] = useState<Msg[]>(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveHistory(messages);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (overrideText?: string, overrideAction?: AiAction) => {
    const text = (overrideText ?? input).trim();
    const act = overrideAction ?? action;
    if ((!text && !contextData && act !== 'agent') || loading) return;
    const userMsg: Msg = { role: 'user', text: text || `(${act})`, action: act, ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      if (act === 'agent') {
        const r = await aiApi.agent(text || 'Что мне сейчас нужно сделать?', contextData);
        const aiMsg: Msg = {
          role: 'ai',
          text: r.reasoning || 'Готов предложить действия.',
          action: act,
          ts: Date.now(),
          reasoning: r.reasoning,
          agentActions: (r.actions || []).map(a => ({ ...a, status: 'pending' as const })),
        };
        setMessages(m => [...m, aiMsg]);
      } else {
        const r = await aiApi.ask(act, text, contextData);
        const aiMsg: Msg = {
          role: 'ai',
          text: r.text,
          action: act,
          ts: Date.now(),
          suggestion: detectSuggestion(r.text, act, currentText),
          status: 'pending',
        };
        setMessages(m => [...m, aiMsg]);
        onResult?.(r.text);
      }
    } catch (e: unknown) {
      setMessages(m => [
        ...m,
        { role: 'ai', text: 'Ошибка: ' + (e instanceof Error ? e.message : 'неизвестно'), ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAgentAction = async (msgIdx: number, actIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg?.agentActions) return;
    const target = msg.agentActions[actIdx];
    if (!target || target.status !== 'pending') return;
    setMessages(m => m.map((x, i) => i === msgIdx && x.agentActions
      ? { ...x, agentActions: x.agentActions.map((a, j) => j === actIdx ? { ...a, status: 'pending', resultMessage: 'Выполняется...' } : a) }
      : x));
    try {
      const res = await aiApi.execute([{ type: target.type, title: target.title, description: target.description, risk: target.risk, params: target.params }]);
      const r = res.results?.[0]?.result || {};
      const ok = !!r.ok;
      setMessages(m => m.map((x, i) => i === msgIdx && x.agentActions
        ? { ...x, agentActions: x.agentActions.map((a, j) => j === actIdx ? { ...a, status: ok ? 'applied' : 'failed', resultMessage: r.message || r.error || '' } : a) }
        : x));
    } catch (e: unknown) {
      setMessages(m => m.map((x, i) => i === msgIdx && x.agentActions
        ? { ...x, agentActions: x.agentActions.map((a, j) => j === actIdx ? { ...a, status: 'failed', resultMessage: e instanceof Error ? e.message : 'Ошибка' } : a) }
        : x));
    }
  };

  const rejectAgentAction = (msgIdx: number, actIdx: number) => {
    setMessages(m => m.map((x, i) => i === msgIdx && x.agentActions
      ? { ...x, agentActions: x.agentActions.map((a, j) => j === actIdx ? { ...a, status: 'rejected' as const } : a) }
      : x));
  };

  const confirmAllAgentActions = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg?.agentActions) return;
    for (let i = 0; i < msg.agentActions.length; i++) {
      if (msg.agentActions[i].status === 'pending') {
        await confirmAgentAction(msgIdx, i);
      }
    }
  };

  const applySuggestion = (idx: number) => {
    setMessages(m => m.map((msg, i) => {
      if (i !== idx || !msg.suggestion) return msg;
      onApply?.(msg.suggestion.after, msg.suggestion.kind);
      try {
        navigator.clipboard.writeText(msg.suggestion.after);
      } catch {
        // ignore clipboard errors
      }
      return { ...msg, status: 'applied' as const };
    }));
  };

  const rejectSuggestion = (idx: number) => {
    setMessages(m => m.map((msg, i) => (i === idx ? { ...msg, status: 'rejected' as const } : msg)));
  };

  const requestEdit = (idx: number) => {
    const msg = messages[idx];
    if (!msg) return;
    setInput(`Доработай: ${msg.text.slice(0, 200)}...`);
    setAction(msg.action || action);
  };

  const clearHistory = () => {
    if (!confirm('Очистить историю чата?')) return;
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const runQuick = (q: QuickCmd) => {
    setAction(q.action);
    if (q.prompt) {
      send(q.prompt, q.action);
    } else {
      setInput('');
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <button
        onClick={onClose}
        className="flex-1 bg-black/30 backdrop-blur-[1px]"
        aria-label="Закрыть"
      />
      <aside className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="Sparkles" size={20} />
            <div className="min-w-0">
              <div className="font-display font-700 truncate">{title || 'ИИ-ассистент'}</div>
              <div className="text-xs opacity-80">YandexGPT · BIZNEST</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearHistory}
              title="Очистить историю"
              className="hover:bg-white/10 rounded-lg p-1.5"
            >
              <Icon name="Trash2" size={18} />
            </button>
            <button onClick={onClose} className="hover:bg-white/10 rounded-lg p-1.5">
              <Icon name="X" size={20} />
            </button>
          </div>
        </header>

        <div className="px-3 py-2 border-b border-border overflow-x-auto bg-muted/30">
          <div className="flex gap-2">
            {QUICK_CMDS.map(q => (
              <button
                key={q.id}
                onClick={() => runQuick(q)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition shrink-0 ${
                  action === q.action ? 'bg-brand-blue text-white' : 'bg-white hover:bg-muted border border-border'
                }`}
              >
                <Icon name={q.icon} size={14} />
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Icon name="Bot" size={40} className="mx-auto mb-3 opacity-50" />
              <div className="font-semibold mb-2">Привет! Я твой ИИ-ассистент.</div>
              <div className="text-xs space-y-1">
                <div>Нажми <span className="font-semibold text-brand-blue">«Агент»</span> — и я сам предложу действия, которые надо выполнить.</div>
                <div>Каждое решение ты подтверждаешь вручную.</div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-left max-w-xs mx-auto">
                <div className="px-3 py-2 bg-muted/50 rounded-lg">«Найди объекты без описания и допиши их»</div>
                <div className="px-3 py-2 bg-muted/50 rounded-lg">«Что делать с новыми лидами?»</div>
                <div className="px-3 py-2 bg-muted/50 rounded-lg">«Архивируй старые неактуальные объекты»</div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-brand-blue text-white rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {m.text}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 px-1">{formatTime(m.ts)}</div>

              {m.role === 'ai' && m.suggestion && m.status === 'pending' && (
                <div className="mt-2 w-full max-w-[90%] border border-border rounded-xl p-3 bg-white">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <Icon name="Wand2" size={12} />
                    Предложенная правка
                  </div>
                  {m.suggestion.before && (
                    <div className="mb-2">
                      <div className="text-[10px] text-muted-foreground mb-1">Было:</div>
                      <div className="text-xs bg-red-50 text-red-900 p-2 rounded line-through opacity-70 max-h-24 overflow-y-auto">
                        {m.suggestion.before}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Станет:</div>
                    <div className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded max-h-32 overflow-y-auto">
                      {m.suggestion.after}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => applySuggestion(i)}
                      className="flex-1 btn-blue text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Icon name="Check" size={12} />
                      Применить
                    </button>
                    <button
                      onClick={() => requestEdit(i)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted inline-flex items-center gap-1"
                    >
                      <Icon name="Pencil" size={12} />
                      Изменить
                    </button>
                    <button
                      onClick={() => rejectSuggestion(i)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      <Icon name="X" size={12} />
                      Отклонить
                    </button>
                  </div>
                </div>
              )}

              {m.role === 'ai' && m.status === 'applied' && (
                <div className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1">
                  <Icon name="CheckCircle2" size={12} /> Применено
                </div>
              )}
              {m.role === 'ai' && m.status === 'rejected' && (
                <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                  <Icon name="XCircle" size={12} /> Отклонено
                </div>
              )}

              {m.role === 'ai' && m.agentActions && m.agentActions.length > 0 && (
                <div className="mt-2 w-full max-w-[95%] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase text-muted-foreground flex items-center gap-1">
                      <Icon name="Bot" size={12} />
                      Предложено действий: {m.agentActions.length}
                    </div>
                    {m.agentActions.some(a => a.status === 'pending') && (
                      <button
                        onClick={() => confirmAllAgentActions(i)}
                        className="text-[11px] btn-blue text-white px-2 py-1 rounded-md font-semibold inline-flex items-center gap-1"
                      >
                        <Icon name="CheckCheck" size={12} /> Подтвердить всё
                      </button>
                    )}
                  </div>
                  {m.agentActions.map((a, j) => {
                    const meta = ACTION_LABELS[a.type] || { label: a.type, icon: 'Zap' };
                    return (
                      <div key={j} className="border border-border rounded-xl p-3 bg-white">
                        <div className="flex items-start gap-2 mb-1.5">
                          <div className="mt-0.5 w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                            <Icon name={meta.icon} size={14} className="text-brand-blue" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-sm font-semibold">{a.title || meta.label}</div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${RISK_STYLES[a.risk] || 'bg-muted'}`}>
                                {a.risk === 'high' ? 'риск' : a.risk === 'medium' ? 'средне' : 'безопасно'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                            {a.params && Object.keys(a.params).length > 0 && (
                              <details className="mt-1.5">
                                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">Параметры</summary>
                                <pre className="text-[10px] bg-muted/50 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(a.params, null, 2)}</pre>
                              </details>
                            )}
                          </div>
                        </div>

                        {a.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => confirmAgentAction(i, j)}
                              className="flex-1 btn-blue text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1"
                            >
                              <Icon name="Check" size={12} /> Подтвердить
                            </button>
                            <button
                              onClick={() => rejectAgentAction(i, j)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                            >
                              <Icon name="X" size={12} /> Отклонить
                            </button>
                          </div>
                        )}
                        {a.status === 'applied' && (
                          <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1">
                            <Icon name="CheckCircle2" size={12} />
                            {a.resultMessage || 'Выполнено'}
                          </div>
                        )}
                        {a.status === 'failed' && (
                          <div className="mt-2 text-[11px] text-red-600 flex items-center gap-1">
                            <Icon name="AlertTriangle" size={12} />
                            {a.resultMessage || 'Ошибка'}
                          </div>
                        )}
                        {a.status === 'rejected' && (
                          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                            <Icon name="XCircle" size={12} /> Отклонено
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-3 rounded-2xl flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-white">
          <div className="text-[10px] text-muted-foreground mb-1.5 px-1">
            Активный режим: <span className="font-semibold text-foreground">{QUICK_CMDS.find(q => q.action === action)?.label || action}</span>
          </div>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Введите запрос..."
              rows={2}
              className="flex-1 px-3 py-2 border border-input rounded-xl text-sm resize-none focus:outline-none focus:border-brand-blue"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="btn-blue text-white px-4 rounded-xl disabled:opacity-50"
            >
              <Icon name="Send" size={18} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}