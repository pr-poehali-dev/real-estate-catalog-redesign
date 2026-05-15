import { useState } from 'react';
import { aiApi, AiAction } from '@/lib/adminApi';
import Icon from '@/components/ui/icon';

interface Msg {
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  onClose: () => void;
  initialAction?: AiAction;
  initialPrompt?: string;
  contextData?: unknown;
  onResult?: (text: string) => void;
  title?: string;
}

const ACTIONS: { id: AiAction; label: string; icon: string }[] = [
  { id: 'admin', label: 'Помощь', icon: 'MessageCircle' },
  { id: 'describe', label: 'Описание объекта', icon: 'PenLine' },
  { id: 'reply_lead', label: 'Ответ клиенту', icon: 'Mail' },
  { id: 'seo', label: 'SEO meta', icon: 'Search' },
  { id: 'moderate', label: 'Модерация', icon: 'CheckCircle2' },
  { id: 'analytics', label: 'Аналитика', icon: 'BarChart3' },
];

export default function AiChat({ onClose, initialAction = 'admin', initialPrompt = '', contextData, onResult, title }: Props) {
  const [action, setAction] = useState<AiAction>(initialAction);
  const [input, setInput] = useState(initialPrompt);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const r = await aiApi.ask(action, userMsg, contextData);
      setMessages(m => [...m, { role: 'ai', text: r.text }]);
      onResult?.(r.text);
    } catch (e: unknown) {
      setMessages(m => [
        ...m,
        { role: 'ai', text: 'Ошибка: ' + (e instanceof Error ? e.message : 'неизвестно') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white">
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" size={20} />
            <div>
              <div className="font-display font-700">{title || 'ИИ-ассистент'}</div>
              <div className="text-xs opacity-80">YandexGPT · BIZNEST</div>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 rounded-lg p-1.5">
            <Icon name="X" size={20} />
          </button>
        </header>

        <div className="px-3 py-2 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            {ACTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => setAction(a.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${
                  action === a.id ? 'bg-brand-blue text-white' : 'bg-muted hover:bg-muted/70'
                }`}
              >
                <Icon name={a.icon} size={14} />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Icon name="Bot" size={40} className="mx-auto mb-3 opacity-50" />
              <div>Опиши задачу или вопрос. Например:</div>
              <div className="mt-3 space-y-1 text-xs">
                <div>«Напиши описание для офиса 200 м² на Тверской»</div>
                <div>«Как обработать новый лид правильно?»</div>
                <div>«Сделай meta description для склада в Химках»</div>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brand-blue text-white rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {m.text}
              </div>
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
              onClick={send}
              disabled={loading || !input.trim()}
              className="btn-blue text-white px-4 rounded-xl disabled:opacity-50"
            >
              <Icon name="Send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
