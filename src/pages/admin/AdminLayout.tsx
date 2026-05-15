import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/icon';
import AiChat from '@/components/admin/AiChat';

export type AdminSection = 'dashboard' | 'listings' | 'leads' | 'users' | 'pages' | 'settings' | 'ai-logs';

interface Props {
  section: AdminSection;
  setSection: (s: AdminSection) => void;
  onExit: () => void;
  children: ReactNode;
}

const NAV: { id: AdminSection; label: string; icon: string; roles: string[] }[] = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard', roles: ['admin', 'editor', 'manager'] },
  { id: 'listings', label: 'Объявления', icon: 'Building2', roles: ['admin', 'editor', 'manager'] },
  { id: 'leads', label: 'Лиды', icon: 'Inbox', roles: ['admin', 'editor', 'manager'] },
  { id: 'users', label: 'Пользователи', icon: 'Users', roles: ['admin'] },
  { id: 'pages', label: 'Страницы', icon: 'FileText', roles: ['admin', 'editor'] },
  { id: 'settings', label: 'Настройки', icon: 'Settings', roles: ['admin', 'editor'] },
];

export default function AdminLayout({ section, setSection, onExit, children }: Props) {
  const { user, logout } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;
  const items = NAV.filter(n => n.roles.includes(user.role));

  const roleLabel: Record<string, string> = {
    admin: 'Администратор',
    editor: 'Редактор',
    manager: 'Менеджер',
    client: 'Клиент',
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-border z-40 transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-display font-700 text-xl text-brand-blue">BIZNEST</div>
            <div className="text-xs text-muted-foreground">Админ-панель</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <Icon name="X" size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                section === item.id
                  ? 'bg-brand-blue text-white font-semibold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-white">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground">{roleLabel[user.role]}</div>
          </div>
          <button
            onClick={onExit}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-muted transition"
          >
            <Icon name="ExternalLink" size={16} />
            На сайт
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Icon name="LogOut" size={16} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-border px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Icon name="Menu" size={22} />
            </button>
            <h1 className="font-display font-700 text-xl">
              {items.find(n => n.id === section)?.label || 'Админ-панель'}
            </h1>
          </div>
          {(user.role === 'admin' || user.role === 'editor' || user.role === 'manager') && (
            <button
              onClick={() => setAiOpen(true)}
              className="btn-orange text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <Icon name="Sparkles" size={16} />
              <span className="hidden sm:inline">ИИ-ассистент</span>
            </button>
          )}
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>

      {aiOpen && <AiChat onClose={() => setAiOpen(false)} />}
    </div>
  );
}
