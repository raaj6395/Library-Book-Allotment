const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const getToken = () => localStorage.getItem("auth_token");
const setToken = (token: string) => localStorage.setItem("auth_token", token);
const removeToken = () => localStorage.removeItem("auth_token");

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors
        .map((e: any) => e.msg || e.message || JSON.stringify(e))
        .join(", ");
      throw new Error(errorMessages);
    }
    throw new Error(
      error.error || error.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data && data.token) setToken(data.token);
    return data;
  },

  logout: () => {
    removeToken();
  },

  getCurrentUser: async () => {
    return apiRequest("/auth/me");
  },
};

export const booksAPI = {
  getAll: async (opts: { search?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();

    if (opts.search) params.append("search", opts.search);
    if (opts.page) params.append("page", String(opts.page));
    if (opts.limit) params.append("limit", String(opts.limit));

    const query = params.toString() ? `?${params.toString()}` : "";

    return apiRequest(`/books${query}`);
  },
  getById: (id: string) => apiRequest(`/books/${id}`),
  create: (book: any) =>
    apiRequest("/books", {
      method: "POST",
      body: JSON.stringify(book),
    }),
  update: (id: string, book: any) =>
    apiRequest(`/books/${id}`, {
      method: "PUT",
      body: JSON.stringify(book),
    }),
  delete: (id: string) =>
    apiRequest(`/books/${id}`, {
      method: "DELETE",
    }),
  list: async (
    opts: { search?: string; page?: number; limit?: number } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.search) params.append("search", opts.search);
    if (opts.page) params.append("page", String(opts.page));
    if (opts.limit) params.append("limit", String(opts.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/books${query}`);
  },
};

export const usersAPI = {
  getAll: () => apiRequest("/users"),
  getById: (id: string) => apiRequest(`/users/${id}`),
  create: (user: any) =>
    apiRequest("/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),
  update: (id: string, user: any) =>
    apiRequest(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    }),
  delete: (id: string) =>
    apiRequest(`/users/${id}`, {
      method: "DELETE",
    }),
};

export const preferencesAPI = {
  getMyPreferences: () => apiRequest("/preferences/me"),
  submitPreferences: (rankedBookIds: string[]) =>
    apiRequest("/preferences", {
      method: "POST",
      body: JSON.stringify({ rankedBookIds }),
    }),
  getAll: () => apiRequest("/preferences/all"),
};

export const allotmentAPI = {
  runAllotment: () =>
    apiRequest("/allotment/run", {
      method: "POST",
    }),
  getResults: (eventId: string) => apiRequest(`/allotment/results/${eventId}`),
  getEvents: () => apiRequest("/allotment/events"),
  getMyAllocation: () => apiRequest("/allotment/my-allocation"),
  downloadReport: async (eventId: string) => {
    const headers: HeadersInit = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(
      `${API_BASE_URL}/allotment/report/${eventId}`,
      { headers },
    );
    if (!response.ok) throw new Error("Failed to download report");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allotment-report-${eventId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const adminBooksAPI = {
  list: async (
    opts: { search?: string; page?: number; limit?: number } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.search) params.append("search", opts.search);
    if (opts.page) params.append("page", String(opts.page ?? 1));
    if (opts.limit) params.append("limit", String(opts.limit ?? 20));
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/books${query}`);
  },
  create: async (payload: { title: string; author?: string }) => {
    return apiRequest("/books", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  remove: async (bookId: string) => {
    return apiRequest(`/books/${bookId}`, {
      method: "DELETE",
    });
  },
};
