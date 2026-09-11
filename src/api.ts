const API_BASE = 'http://127.0.0.1:8000';

export interface UserSession {
  token: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface SchemeItem {
  id: string;
  name: string;
  department: string;
  description: string;
  category: string;
  location: string;
  beneficiaries: string;
  benefit: string;
  documents: string[];
  updated: string;
  link: string;
  application_url?: string;
  application_mode?: string;
  rules: Record<string, any>;
}

export interface ChatResponse {
  session_id?: string;
  answer: string;
  sources: string[];
  scheme?: SchemeItem;
  generated_at: string;
}

export const authApi = {
  getToken(): string | null {
    return localStorage.getItem('sahayak_token');
  },

  getUser(): UserSession['user'] | null {
    const raw = localStorage.getItem('sahayak_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(token: string, user: UserSession['user']) {
    localStorage.setItem('sahayak_token', token);
    localStorage.setItem('sahayak_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('sahayak_token');
    localStorage.removeItem('sahayak_user');
  },

  async signup(email: string, password: string, fullName: string): Promise<UserSession> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Failed to create account');
    }
    const session: UserSession = {
      token: data.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName || data.user.email.split('@')[0],
      },
    };
    if (session.token) {
      this.setSession(session.token, session.user);
    }
    return session;
  },

  async login(email: string, password: string): Promise<UserSession> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Incorrect email or password');
    }
    const user = {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.full_name || data.user.email.split('@')[0],
    };
    this.setSession(data.access_token, user);
    return { token: data.access_token, user };
  },

  async logout() {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore network failures on logout
      }
    }
    this.clearSession();
  },

  async getProfile() {
    const token = this.getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },
};

export const schemesApi = {
  async getSchemes(params?: { q?: string; category?: string; state?: string }): Promise<SchemeItem[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.category && params.category !== 'All categories') query.set('category', params.category);
    if (params?.state && params.state !== 'All India') query.set('state', params.state);

    const url = `${API_BASE}/schemes${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch schemes');
    const data = await res.json();
    return data.data || [];
  },

  async getScheme(id: string): Promise<SchemeItem> {
    const res = await fetch(`${API_BASE}/schemes/${id}`);
    if (!res.ok) throw new Error('Scheme not found');
    return res.json();
  },

  async adminCreateScheme(payload: Partial<SchemeItem>): Promise<SchemeItem> {
    const token = authApi.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-key': 'sahayak-admin',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/schemes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to add scheme');
    return data.scheme;
  },

  async adminUpdateScheme(id: string, payload: Partial<SchemeItem>): Promise<void> {
    const token = authApi.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-key': 'sahayak-admin',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/schemes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update scheme');
  },

  async adminDeleteScheme(id: string): Promise<void> {
    const token = authApi.getToken();
    const headers: Record<string, string> = {
      'x-admin-key': 'sahayak-admin',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/schemes/${id}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to delete scheme');
  },

  async adminSeedSchemes(): Promise<{ seeded_count: number; seeded_schemes: string[] }> {
    const token = authApi.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-key': 'sahayak-admin',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/schemes/seed`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to seed schemes');
    return data;
  },
};

export const aiApi = {
  async chat(message: string, schemeId?: string, sessionId?: string): Promise<ChatResponse> {
    const token = authApi.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, scheme_id: schemeId, session_id: sessionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'AI Assistant unavailable');
    return data;
  },

  async getVoiceAudio(text: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  },
};
