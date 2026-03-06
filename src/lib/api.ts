const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getCredentials = () => {
  const email = localStorage.getItem('user_email');
  const password = localStorage.getItem('user_password');
  return email && password ? { email, password } : null;
};

const setCredentials = (email: string, password: string) => {
  localStorage.setItem('user_email', email);
  localStorage.setItem('user_password', password);
};

const removeCredentials = () => {
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_password');
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const credentials = getCredentials();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (credentials) {
    headers['x-user-email'] = credentials.email;
    headers['x-user-password'] = credentials.password;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
      throw new Error(errorMessages);
    }
    throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCredentials(email, password);
    return data;
  },

  logout: () => {
    removeCredentials();
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
};

export const booksAPI = {
  getAll: () => apiRequest('/books'),
  getById: (id: string) => apiRequest(`/books/${id}`),
  create: (book: any) => apiRequest('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  }),
  update: (id: string, book: any) => apiRequest(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(book),
  }),
  delete: (id: string) => apiRequest(`/books/${id}`, {
    method: 'DELETE',
  }),
  list: async (opts: { search?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.append('search', opts.search);
    if (opts.page) params.append('page', String(opts.page));
    if (opts.limit) params.append('limit', String(opts.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/books${query}`);
  },
};

export const usersAPI = {
  getAll: () => apiRequest('/users'),
  getById: (id: string) => apiRequest(`/users/${id}`),
  create: (user: any) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
  update: (id: string, user: any) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  }),
  delete: (id: string) => apiRequest(`/users/${id}`, {
    method: 'DELETE',
  }),
};

export const preferencesAPI = {
  getMyPreferences: () => apiRequest('/preferences/me'),
  submitPreferences: (rankedBookIds: string[]) => apiRequest('/preferences', {
    method: 'POST',
    body: JSON.stringify({ rankedBookIds }),
  }),
  getAll: () => apiRequest('/preferences/all'),
};

export const allotmentAPI = {
  runAllotment: () => apiRequest('/allotment/run', {
    method: 'POST',
  }),
  getResults: (eventId: string) => apiRequest(`/allotment/results/${eventId}`),
  getEvents: () => apiRequest('/allotment/events'),
  getMyAllocation: () => apiRequest('/allotment/my-allocation'),
  downloadReport: async (eventId: string) => {
    const credentials = getCredentials();
    const headers: HeadersInit = {};
    if (credentials) {
      headers['x-user-email'] = credentials.email;
      headers['x-user-password'] = credentials.password;
    }
    const response = await fetch(`${API_BASE_URL}/allotment/report/${eventId}`, { headers });
    if (!response.ok) throw new Error('Failed to download report');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allotment-report-${eventId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const adminBooksAPI = {
  list: async (opts: { search?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.append('search', opts.search);
    if (opts.page) params.append('page', String(opts.page ?? 1));
    if (opts.limit) params.append('limit', String(opts.limit ?? 20));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/books${query}`);
  },
  create: async (payload: { title: string; author?: string }) => {
    return apiRequest('/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  remove: async (bookId: string) => {
    return apiRequest(`/books/${bookId}`, {
      method: 'DELETE',
    });
  },
};

export { getCredentials, setCredentials, removeCredentials };
