import { useState } from 'react';
import AdminLayout, { AdminSection } from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import ListingsAdmin from './admin/ListingsAdmin';
import LeadsAdmin from './admin/LeadsAdmin';
import UsersAdmin from './admin/UsersAdmin';
import PagesAdmin from './admin/PagesAdmin';
import SettingsAdmin from './admin/SettingsAdmin';

interface Props {
  onExit: () => void;
}

export default function AdminPage({ onExit }: Props) {
  const [section, setSection] = useState<AdminSection>('dashboard');

  return (
    <AdminLayout section={section} setSection={setSection} onExit={onExit}>
      {section === 'dashboard' && <Dashboard />}
      {section === 'listings' && <ListingsAdmin />}
      {section === 'leads' && <LeadsAdmin />}
      {section === 'users' && <UsersAdmin />}
      {section === 'pages' && <PagesAdmin />}
      {section === 'settings' && <SettingsAdmin />}
    </AdminLayout>
  );
}
