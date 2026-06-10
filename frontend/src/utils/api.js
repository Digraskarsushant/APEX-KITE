import axios from 'axios';
import { Platform } from 'react-native';

const getBackendUrls = () => {
  // If deployed to Vercel, use the environment variable pointing to the Render backend
  if (process.env.EXPO_PUBLIC_API_URL) {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, ""); // remove trailing slash
    const wsUrl = apiUrl.startsWith('https') ? apiUrl.replace('https', 'wss') : apiUrl.replace('http', 'ws');
    return {
      api: apiUrl,
      ws: wsUrl
    };
  }

  // Fallback for Render monolithic deploy (frontend served by backend)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // If running locally via Expo Web, don't point to localhost:8081 for API
    if (hostname === 'localhost' && window.location.port === '8081') {
      return { api: 'http://localhost:8000', ws: 'ws://localhost:8000' };
    }
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return {
      api: `${protocol}://${hostname}${port}`,
      ws: `${wsProtocol}://${hostname}${port}`
    };
  }
  
  // Native mobile device connected to the same Wi-Fi network as the backend server
  return {
    api: 'http://192.168.0.22:8000',
    ws: 'ws://192.168.0.22:8000'
  };
};

const urls = getBackendUrls();
const API_BASE_URL = urls.api;
const WS_BASE_URL = urls.ws;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Authentication
  login: async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    return res.data;
  },

  register: async (username, email, password) => {
    const res = await api.post('/api/auth/register', { username, email, password });
    return res.data;
  },

  requestOtp: async (username, email, password) => {
    const res = await api.post('/api/auth/request_otp', { username, email, password });
    return res.data;
  },

  // User Profile
  getUserProfile: async (userId = 1) => {
    const res = await api.get(`/api/user/profile?user_id=${userId}`);
    return res.data;
  },

  addFunds: async (amount, userId = 1) => {
    const res = await api.post(`/api/user/add_funds?user_id=${userId}`, { amount });
    return res.data;
  },

  resetAccount: async (userId = 1) => {
    const res = await api.post(`/api/user/reset?user_id=${userId}`);
    return res.data;
  },

  // Stock Search / Discover
  searchStocks: async () => {
    const res = await api.get('/api/stocks/search');
    return res.data;
  },

  // Stock History & Indicators
  getStockHistory: async (symbol, interval = '1m') => {
    const res = await api.get(`/api/stocks/${symbol}/history?interval=${interval}`);
    return res.data;
  },

  // Watchlist
  getWatchlist: async (userId = 1) => {
    const res = await api.get(`/api/watchlist?user_id=${userId}`);
    return res.data;
  },

  addToWatchlist: async (symbol, userId = 1) => {
    const res = await api.post(`/api/watchlist?user_id=${userId}`, { symbol });
    return res.data;
  },

  removeFromWatchlist: async (symbol, userId = 1) => {
    const res = await api.delete(`/api/watchlist/${symbol}?user_id=${userId}`);
    return res.data;
  },

  // Orders
  getOrders: async (userId = 1) => {
    const res = await api.get(`/api/orders?user_id=${userId}`);
    return res.data;
  },

  placeOrder: async (orderData, userId = 1) => {
    const res = await api.post(`/api/orders?user_id=${userId}`, orderData);
    return res.data;
  },

  cancelOrder: async (orderId, userId = 1) => {
    const res = await api.delete(`/api/orders/${orderId}?user_id=${userId}`);
    return res.data;
  },

  // Portfolio
  getHoldings: async (userId = 1) => {
    const res = await api.get(`/api/portfolio/holdings?user_id=${userId}`);
    return res.data;
  },

  getPositions: async (userId = 1) => {
    const res = await api.get(`/api/portfolio/positions?user_id=${userId}`);
    return res.data;
  },

  // Simulator Fluctuation Controls
  getSimulatorStatus: async () => {
    const res = await api.get('/api/simulator/status');
    return res.data;
  },

  toggleSimulatorFluctuations: async (active) => {
    const res = await api.post(`/api/simulator/toggle_fluctuations?active=${active}`);
    return res.data;
  },

  getExchangeRates: async () => {
    const res = await api.get('/api/simulator/exchange_rates');
    return res.data;
  },
};

// WebSocket ticker creator
export const createWebSocketTicker = (onMessage, onError) => {
  const wsUrl = `${WS_BASE_URL}/ws/ticker`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Error parsing ticker message:', e);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket Error:', err);
    if (onError) onError(err);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed.');
  };

  return ws;
};

export const getCurrencySymbol = (symbol = '') => {
  if (!symbol) return '₹';
  const parts = symbol.split('_');
  const baseSymbol = parts[0].toUpperCase();

  const usdSymbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SP500', 'NASDAQ', 'DOW'];
  const gbpSymbols = ['FTSE100'];
  const jpySymbols = ['NIKKEI'];

  if (usdSymbols.includes(baseSymbol)) return '$';
  if (gbpSymbols.includes(baseSymbol)) return '£';
  if (jpySymbols.includes(baseSymbol)) return '¥';

  return '₹';
};

export const getExchangeRateToINR = (symbol = '') => {
  if (!symbol) return 1.0;
  const parts = symbol.split('_');
  const baseSymbol = parts[0].toUpperCase();

  const usdSymbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SP500', 'NASDAQ', 'DOW'];
  const gbpSymbols = ['FTSE100'];
  const jpySymbols = ['NIKKEI'];

  if (usdSymbols.includes(baseSymbol)) return 83.5;
  if (gbpSymbols.includes(baseSymbol)) return 106.0;
  if (jpySymbols.includes(baseSymbol)) return 0.55;

  return 1.0;
};

export { API_BASE_URL, WS_BASE_URL };
