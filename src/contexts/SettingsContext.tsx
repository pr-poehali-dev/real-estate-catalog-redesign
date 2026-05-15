import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchPublicSettings, PublicSettings } from '@/lib/api';

interface Ctx {
  settings: PublicSettings;
  reload: () => Promise<void>;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>({});

  const reload = async () => {
    const s = await fetchPublicSettings();
    setSettings(s);
  };

  useEffect(() => {
    reload();
  }, []);

  return <SettingsCtx.Provider value={{ settings, reload }}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error('useSettings must be used within SettingsProvider');
  return v;
}
