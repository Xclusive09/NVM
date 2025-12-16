const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    // Only set Content-Type for JSON bodies, not FormData
    if (body && !(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async signup(data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) {
    return this.request<{ user: any; accessToken: string }>('/auth/signup', {
      method: 'POST',
      body: data,
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ user: any; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: data,
    });
  }

  async getProfile() {
    return this.request<any>('/auth/me');
  }

  // Wallet endpoints
  async getWallet() {
    return this.request<any>('/wallet');
  }

  async getWalletBalance() {
    return this.request<{ balance: number }>('/wallet/balance');
  }

  async getWalletTransactions(page = 1, limit = 20) {
    return this.request<any>(`/wallet/transactions?page=${page}&limit=${limit}`);
  }

  // Payment endpoints
  async initializePayment(amount: number, callbackUrl?: string) {
    return this.request<{ authorizationUrl: string; accessCode: string; reference: string }>(
      '/payment/initialize',
      {
        method: 'POST',
        body: { amount, callbackUrl },
      }
    );
  }

  async verifyPayment(reference: string) {
    return this.request<{ status: string; message: string }>(`/payment/verify?reference=${reference}`);
  }

  async getPaymentHistory(page = 1, limit = 20) {
    return this.request<any>(`/payment/history?page=${page}&limit=${limit}`);
  }

  // Distribution endpoints
  async createDistribution(data: {
    network: string;
    valueType: string;
    amount?: number;
    dataPlanId?: string;
    phoneNumbers: string[];
  }) {
    return this.request<any>('/distribution', {
      method: 'POST',
      body: data,
    });
  }

  async getDistributionBatches(page = 1, limit = 20) {
    return this.request<any>(`/distribution/batches?page=${page}&limit=${limit}`);
  }

  async getDistributionBatch(id: string) {
    return this.request<any>(`/distribution/batches/${id}`);
  }

  async getDataPlans(network: string) {
    return this.request<any[]>(`/distribution/data-plans/${network}`);
  }
}

export const api = new ApiClient(API_BASE_URL);
