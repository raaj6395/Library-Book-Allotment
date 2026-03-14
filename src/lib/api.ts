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
  runAllotment: (payload: { course: string; year: string; semesterType: string; semesterYear: number }) =>
    apiRequest("/allotment/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getResults: (eventId: string) => apiRequest(`/allotment/results/${eventId}`),
  getEvents: () => apiRequest("/allotment/events"),
  getMyAllocation: () => apiRequest("/allotment/my-allocation"),
  resetTokens: (semesterType: string, semesterYear: number) =>
    apiRequest("/allotment/reset-tokens", {
      method: "POST",
      body: JSON.stringify({ semesterType, semesterYear }),
    }),
getSlip: (regNo: string) => apiRequest(`/allotment/slip/${encodeURIComponent(regNo)}`),
  getReturns: (regNo: string) => apiRequest(`/allotment/returns/${encodeURIComponent(regNo)}`),
  markReturned: (allotmentId: string) =>
    apiRequest(`/allotment/return/${allotmentId}`, { method: "POST" }),
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
  downloadNonReturnedReport: async () => {
    const headers: HeadersInit = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/allotment/non-returned-report`, { headers });
    if (!response.ok) throw new Error("Failed to download report");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "non-returned-books.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const studentsAPI = {
  list: (course?: string, year?: string) => {
    const params = new URLSearchParams();
    if (course) params.append("course", course);
    if (year) params.append("year", year);
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/students${q}`);
  },
  clear: (course?: string, year?: string) => {
    const params = new URLSearchParams();
    if (course) params.append("course", course);
    if (year) params.append("year", year);
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/students/clear${q}`, { method: "DELETE" });
  },
  uploadExcel: async (file: File, course: string, year: string) => {
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/octet-stream",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(
      `${API_BASE_URL}/students/upload?course=${encodeURIComponent(course)}&year=${encodeURIComponent(year)}`,
      { method: "POST", headers, body: await file.arrayBuffer() },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Upload failed");
    }
    return response.json();
  },
};

export const bookUploadAPI = {
  uploadExcel: async (file: File) => {
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/octet-stream",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/books/bulk-upload`, {
      method: "POST",
      headers,
      body: await file.arrayBuffer(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Upload failed");
    }
    return response.json();
  },
};

export const sessionAPI = {
  getActive: (): Promise<{ session: { _id: string; year: number; semesterType: 'ODD' | 'EVEN'; status: 'ACTIVE' | 'INACTIVE'; createdAt: string; endedAt?: string } | null }> =>
    apiRequest('/admin/session/active'),

  create: (payload: { year: number; semesterType: 'ODD' | 'EVEN' }) =>
    apiRequest('/admin/session', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  end: () =>
    apiRequest('/admin/session/end', { method: 'POST' }),

  getHistory: () => apiRequest('/admin/session/history'),

  runAllotment: (payload: { course: string; year: string }) =>
    apiRequest('/admin/session/run-allotment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const tokenAPI = {
  lookup: (tokenNumber: string) =>
    apiRequest(`/tokens/${encodeURIComponent(tokenNumber)}`),

  markPickedUp: (tokenNumber: string) =>
    apiRequest(`/tokens/${encodeURIComponent(tokenNumber)}/pickup`, { method: 'PUT' }),

  markReturned: (tokenNumber: string) =>
    apiRequest(`/tokens/${encodeURIComponent(tokenNumber)}/return`, { method: 'PUT' }),

  getUnreturned: (sessionId?: string) => {
    const params = sessionId ? `?sessionId=${sessionId}` : '';
    return apiRequest(`/tokens/unreturned${params}`);
  },

  downloadUnreturned: async (sessionId?: string) => {
    const headers: HeadersInit = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const params = sessionId ? `?sessionId=${sessionId}` : '';
    const response = await fetch(`${API_BASE_URL}/tokens/unreturned/download${params}`, { headers });
    if (!response.ok) throw new Error('Failed to download report');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unreturned-books.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const archiveAPI = {
  getBySession: (sessionId: string) =>
    apiRequest(`/archive/${sessionId}`),
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
