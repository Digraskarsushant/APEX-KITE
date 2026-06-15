import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { apiService, createWebSocketTicker } from '../utils/api';
import { useColorScheme } from 'react-native';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  });
  
  const [userId, setUserId] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('userId');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // App settings & preferences (Realistic configurations!)
  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      theme: 'Deep Black OLED',
      appearance: 'system', // 'dark' | 'light' | 'system'
      defaultChartMode: 'candle',
      tickerFrequency: '1s (Standard)',
      intradayLeverage: 5,
      soundAlerts: true,
      tradingMode: 'paper', // 'paper' | 'broker'
      broker: 'Alpaca Markets', // 'Alpaca Markets' | 'Interactive Brokers'
      clientId: '',
      apiKey: '',
      apiSecret: '',
      realMoneyEnabled: false,
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('settings');
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  const [userProfile, setUserProfile] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [liveTicks, setLiveTicks] = useState({});
  const [holdings, setHoldings] = useState([]);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeStockSymbol, setActiveStockSymbol] = useState('NIFTY50');
  const [exchangeRates, setExchangeRates] = useState({
    USD: 95.62,
    GBP: 106.0,
    JPY: 0.55,
    INR: 1.0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);

  const refreshProfile = async (uid = userId) => {
    try {
      const profile = await apiService.getUserProfile(uid);
      setUserProfile(profile);
    } catch (e) {
      console.error('Error fetching user profile:', e);
    }
  };

  const refreshPortfolio = async (uid = userId) => {
    try {
      const [holdingsData, positionsData] = await Promise.all([
        apiService.getHoldings(uid),
        apiService.getPositions(uid),
      ]);
      setHoldings(holdingsData);
      setPositions(positionsData);
    } catch (e) {
      console.error('Error fetching portfolio:', e);
    }
  };

  const refreshOrders = async (uid = userId) => {
    try {
      const ordersData = await apiService.getOrders(uid);
      setOrders(ordersData);
    } catch (e) {
      console.error('Error fetching orders:', e);
    }
  };

  const refreshWatchlist = async (uid = userId) => {
    try {
      const items = await apiService.getWatchlist(uid);
      setWatchlist(items.map((i) => i.symbol));
    } catch (e) {
      console.error('Error fetching watchlist:', e);
    }
  };

  // Re-connectable WebSocket ticker subscription
  const startWebSocketTicker = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    wsRef.current = createWebSocketTicker(
      (ticks) => {
        setLiveTicks((prev) => ({
          ...prev,
          ...ticks,
        }));
      },
      (err) => {
        console.error('Ticker WS error, retrying in 5 seconds...', err);
        setTimeout(startWebSocketTicker, 5000);
      }
    );
  };

  const initializeApp = async (uid = userId) => {
    setLoading(true);
    try {
      // Fetch dynamic real-time exchange rates on startup
      try {
        const rates = await apiService.getExchangeRates();
        setExchangeRates(rates);
      } catch (rateErr) {
        console.error('Failed to load exchange rates, using fallback: ', rateErr);
      }

      await Promise.all([
        refreshProfile(uid),
        refreshWatchlist(uid),
        refreshPortfolio(uid),
        refreshOrders(uid),
      ]);
      startWebSocketTicker();
      setError(null);
    } catch (e) {
      console.error('Failed to initialize app:', e);
      setError('Connection to backend failed. Please verify the backend is running at http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger initialize if logged in
  useEffect(() => {
    if (isLoggedIn) {
      initializeApp(userId);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isLoggedIn, userId]);

  // Auth Operations
  const loginAction = async (username, password) => {
    try {
      const res = await apiService.login(username, password);
      setUserId(res.user_id);
      const userObj = {
        username: res.username,
        email: res.email,
      };
      setCurrentUser(userObj);
      setIsLoggedIn(true);

      // Persist to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('isLoggedIn', 'true');
        window.localStorage.setItem('userId', res.user_id.toString());
        window.localStorage.setItem('currentUser', JSON.stringify(userObj));
      }

      return { success: true };
    } catch (e) {
      console.error('Login action failed:', e);
      const detail = e.response?.data?.detail || 'Invalid username or password.';
      return { success: false, error: detail };
    }
  };

  const registerAction = async (username, email, password) => {
    try {
      const res = await apiService.register(username, email, password);
      // Auto login upon successful registration
      setUserId(res.user_id);
      const userObj = {
        username: res.username,
        email: res.email,
      };
      setCurrentUser(userObj);
      setIsLoggedIn(true);

      // Persist to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('isLoggedIn', 'true');
        window.localStorage.setItem('userId', res.user_id.toString());
        window.localStorage.setItem('currentUser', JSON.stringify(userObj));
      }

      return { success: true };
    } catch (e) {
      console.error('Registration action failed:', e);
      const detail = e.response?.data?.detail || 'Registration failed. Try another username/email.';
      return { success: false, error: detail };
    }
  };

  const requestOtpAction = async (username, email, password) => {
    try {
      const res = await apiService.requestOtp(username, email, password);
      return { success: true, message: res.message, sandboxOtp: res.debug_otp };
    } catch (e) {
      console.error('Request OTP failed:', e);
      const detail = e.response?.data?.detail || 'Failed to send OTP. Try another username/email.';
      return { success: false, error: detail };
    }
  };

  const logoutAction = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsLoggedIn(false);
    setUserId(1);
    setCurrentUser(null);
    setUserProfile(null);
    setWatchlist([]);
    setHoldings([]);
    setPositions([]);
    setOrders([]);

    // Clear from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('isLoggedIn');
      window.localStorage.removeItem('userId');
      window.localStorage.removeItem('currentUser');
    }
  };

  // Watchlist Actions
  const toggleWatchlist = async (symbol) => {
    try {
      if (watchlist.includes(symbol)) {
        await apiService.removeFromWatchlist(symbol, userId);
        setWatchlist((prev) => prev.filter((s) => s !== symbol));
      } else {
        await apiService.addToWatchlist(symbol, userId);
        setWatchlist((prev) => [...prev, symbol]);
      }
    } catch (e) {
      console.error('Failed to toggle watchlist:', e);
    }
  };

  const submitOrder = async (orderData) => {
    try {
      const brokerModeActive = settings.tradingMode === 'broker';
      const realMoneyActive = settings.realMoneyEnabled && brokerModeActive;

      await apiService.placeOrder(orderData, userId);
      await Promise.all([
        refreshProfile(userId),
        refreshPortfolio(userId),
        refreshOrders(userId),
      ]);
      
      if (realMoneyActive) {
        return { 
          success: true, 
          isBroker: true,
          message: `Broker Order Routed: Successfully placed ${orderData.quantity} shares of ${orderData.symbol} with REAL MONEY via ${settings.broker} API gateway at ₹${parseFloat(orderData.price).toFixed(2)}.`
        };
      } else if (brokerModeActive) {
        return { 
          success: true, 
          isBroker: true,
          message: `Broker Sandbox Routed: Successfully simulated execution of ${orderData.quantity} shares of ${orderData.symbol} via ${settings.broker} paper sandbox.`
        };
      }

      return { success: true };
    } catch (e) {
      console.error('Order submission failed:', e);
      const detail = e.response?.data?.detail || 'Order placement failed.';
      return { success: false, error: detail };
    }
  };

  const deletePendingOrder = async (orderId) => {
    try {
      await apiService.cancelOrder(orderId, userId);
      await refreshOrders(userId);
      return { success: true };
    } catch (e) {
      console.error('Cancel order failed:', e);
      return { success: false, error: 'Could not cancel order.' };
    }
  };

  const addVirtualCash = async (amount) => {
    try {
      const profile = await apiService.addFunds(amount, userId);
      setUserProfile(profile);
      return { success: true };
    } catch (e) {
      console.error('Failed to add funds:', e);
      const detail = e.response?.data?.detail || 'Failed to deposit virtual cash. Verify your connection.';
      return { success: false, error: detail };
    }
  };

  const resetDemoProfile = async () => {
    setLoading(true);
    try {
      const profile = await apiService.resetAccount(userId);
      setUserProfile(profile);
      setWatchlist(["NIFTY50", "SENSEX", "BANKNIFTY", "RELIANCE", "TCS", "INFY"]);
      setHoldings([]);
      setPositions([]);
      setOrders([]);
      setError(null);
    } catch (e) {
      console.error('Failed to reset account:', e);
    } finally {
      setLoading(false);
    }
  };

  // Update specific settings configurations
  const updateSettings = (key, value) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('settings', JSON.stringify(next));
      }
      return next;
    });
  };

  const getLotSize = (symbol) => {
    const parts = symbol.split('_');
    if (parts.length === 3 && (parts[2] === 'CE' || parts[2] === 'PE')) {
      const underlying = parts[0];
      const lotSizes = {
        "NIFTY50": 50, "SENSEX": 10, "BANKNIFTY": 15, "NIFTYIT": 50,
        "SP500": 10, "NASDAQ": 10, "DOW": 10, "FTSE100": 10, "NIKKEI": 100,
        "AAPL": 100, "MSFT": 100, "NVDA": 100, "GOOGL": 100, "AMZN": 100, "TSLA": 100, "META": 100
      };
      return lotSizes[underlying] || 1;
    }
    return 1;
  };

  const getExchangeRateToINR = (symbol = '') => {
    if (!symbol) return 1.0;
    const parts = symbol.split('_');
    const baseSymbol = parts[0].toUpperCase();

    const usdSymbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SP500', 'NASDAQ', 'DOW'];
    const gbpSymbols = ['FTSE100'];
    const jpySymbols = ['NIKKEI'];

    let quoteCurrency = 'INR';

    if (usdSymbols.includes(baseSymbol)) {
      quoteCurrency = 'USD';
    } else if (gbpSymbols.includes(baseSymbol)) {
      quoteCurrency = 'GBP';
    } else if (jpySymbols.includes(baseSymbol)) {
      quoteCurrency = 'JPY';
    } else if (baseSymbol.length === 6) {
      // Forex pairs are 6 characters long (e.g., EURUSD). The last 3 are the quote currency!
      quoteCurrency = baseSymbol.substring(3, 6);
    }

    if (quoteCurrency === 'INR') return 1.0;
    return exchangeRates[quoteCurrency] || 1.0;
  };

  // Auto-ticking portfolio evaluator (computes overall unrealized P&L by joining live prices)
  const getPortfolioSummary = () => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealizedPnL = 0;
    let totalUnrealizedPnL = 0;

    // Evaluate Holdings P&L
    const enrichedHoldings = holdings.map((h) => {
      const currentPrice = liveTicks[h.symbol]?.price || h.average_price;
      const lotSize = getLotSize(h.symbol);
      const invested = h.average_price * h.quantity * lotSize;
      const currentVal = currentPrice * h.quantity * lotSize;
      const pnl = currentVal - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      const rate = getExchangeRateToINR(h.symbol);
      totalInvested += invested * rate;
      totalCurrentValue += currentVal * rate;
      totalUnrealizedPnL += pnl * rate;

      return {
        ...h,
        currentPrice,
        investment_value: invested,
        current_value: currentVal,
        pnl,
        pnl_percent: pnlPercent,
      };
    });

    // Evaluate Active Positions P&L
    const enrichedPositions = positions.map((p) => {
      const currentPrice = liveTicks[p.symbol]?.price || p.average_price;
      const lotSize = getLotSize(p.symbol);
      let unrealized = 0;
      if (!p.is_closed) {
        unrealized = (currentPrice - p.average_price) * p.quantity * lotSize;
      }
      
      const totalP = p.realized_pnl + unrealized;
      const rate = getExchangeRateToINR(p.symbol);
      totalRealizedPnL += p.realized_pnl * rate;
      totalUnrealizedPnL += unrealized * rate;

      return {
        ...p,
        currentPrice,
        unrealized_pnl: unrealized,
        total_pnl: totalP,
      };
    });

    const netPnL = totalRealizedPnL + totalUnrealizedPnL;
    const totalPortfolioValue = totalCurrentValue + (userProfile?.cash_balance || 0);

    return {
      totalInvested: round(totalInvested),
      totalCurrentValue: round(totalCurrentValue),
      totalRealizedPnL: round(totalRealizedPnL),
      totalUnrealizedPnL: round(totalUnrealizedPnL),
      netPnL: round(netPnL),
      totalPortfolioValue: round(totalPortfolioValue),
      enrichedHoldings,
      enrichedPositions,
    };
  };

  const round = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

  // Dynamic Theme resolution
  const systemScheme = useColorScheme(); // 'dark' or 'light'
  const activeMode = settings.appearance === 'system' ? systemScheme : settings.appearance;
  const isDark = activeMode === 'light' ? false : true;

  const theme = {
    isDark,
    mode: activeMode,
    background: isDark ? '#0c1017' : '#f6f8fa',
    card: isDark ? '#161b22' : '#ffffff',
    text: isDark ? '#c9d1d9' : '#24292f',
    textSecondary: isDark ? '#808a9d' : '#57606a',
    border: isDark ? '#30363d' : '#d0d7de',
    accent: '#ff5722',
    accentLight: isDark ? 'rgba(255, 87, 34, 0.15)' : 'rgba(255, 87, 34, 0.08)',
    buttonBg: isDark ? '#21262d' : '#f3f4f6',
    buttonBorder: isDark ? '#30363d' : '#d1d5db',
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        theme,
        userId,
        currentUser,
        settings,
        userProfile,
        watchlist,
        liveTicks,
        orders,
        activeStockSymbol,
        setActiveStockSymbol,
        exchangeRates,
        getExchangeRateToINR,
        loading,
        error,
        initializeApp,
        loginAction,
        registerAction,
        requestOtpAction,
        logoutAction,
        toggleWatchlist,
        submitOrder,
        deletePendingOrder,
        addVirtualCash,
        resetDemoProfile,
        updateSettings,
        portfolioSummary: getPortfolioSummary(),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
