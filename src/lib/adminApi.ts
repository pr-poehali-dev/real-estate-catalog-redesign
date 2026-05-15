const AUTH_URL = 'https://functions.poehali.dev/e5d9d96a-a3ca-45cd-9ea3-3e2982b626f7';
const ADMIN_URL = 'https://functions.poehali.dev/aeccc0fe-9c55-4933-b292-432cec9cc09d';
const AI_URL = 'https://functions.poehali.dev/34bfc4a2-89b9-4c89-bcbc-d82314730aef';

export type Role = 'admin' | 'editor' | 'manager' | 'client';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
}

const TOKEN_KEY = 'biznest_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req(url: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Auth-Token': token } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const authApi = {
  login: (email: string, password: string) =>
    req(`${AUTH_URL}?action=login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    req(`${AUTH_URL}?action=register`, { method: 'POST', body: JSON.stringify(data) }),
  me: () => req(`${AUTH_URL}?action=me`),
  logout: () => req(`${AUTH_URL}?action=logout`, { method: 'POST' }),
};

export const adminApi = {
  // listings
  listListings: () => req(`${ADMIN_URL}?resource=listings`),
  getListing: (id: number) => req(`${ADMIN_URL}?resource=listings&id=${id}`),
  createListing: (data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=listings`, { method: 'POST', body: JSON.stringify(data) }),
  updateListing: (id: number, data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=listings&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveListing: (id: number) =>
    req(`${ADMIN_URL}?resource=listings&id=${id}`, { method: 'DELETE' }),

  // leads
  listLeads: () => req(`${ADMIN_URL}?resource=leads`),
  getLead: (id: number) => req(`${ADMIN_URL}?resource=leads&id=${id}`),
  updateLead: (id: number, data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=leads&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addLeadComment: (id: number, comment: string) =>
    req(`${ADMIN_URL}?resource=leads&id=${id}&action=comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  // users
  listUsers: () => req(`${ADMIN_URL}?resource=users`),
  createUser: (data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=users`, { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=users&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // pages
  listPages: () => req(`${ADMIN_URL}?resource=pages`),
  createPage: (data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=pages`, { method: 'POST', body: JSON.stringify(data) }),
  updatePage: (id: number, data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=pages&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // settings
  getSettings: () => req(`${ADMIN_URL}?resource=settings`),
  updateSettings: (data: Record<string, unknown>) =>
    req(`${ADMIN_URL}?resource=settings`, { method: 'PUT', body: JSON.stringify(data) }),

  // stats
  stats: () => req(`${ADMIN_URL}?resource=stats`),
};

export type AiAction = 'describe' | 'reply_lead' | 'seo' | 'moderate' | 'analytics' | 'admin';

export const aiApi = {
  ask: (action: AiAction, prompt: string, context_data?: unknown) =>
    req(AI_URL, { method: 'POST', body: JSON.stringify({ action, prompt, context_data }) }) as Promise<{ text: string; tokens: number }>,
};
