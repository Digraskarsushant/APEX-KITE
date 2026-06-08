import time
import random
import datetime
import threading
import math
from typing import List, Dict, Any
import yfinance as yf
import pandas as pd

# --- Black-Scholes Options Pricing Engine helpers ---
def norm_cdf(x: float) -> float:
    """Cumulative standard normal distribution function (using built-in erf approximation)."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def calculate_option_premium(spot: float, strike: float, option_type: str, time_to_expiry_days: float = 30.0, volatility: float = 0.20, interest_rate: float = 0.05) -> float:
    """Calculates Call/Put Option Premium using the Black-Scholes model."""
    if spot <= 0 or strike <= 0:
        return 0.0
        
    T = max(0.001, time_to_expiry_days / 365.0)  # time to expiry in years
    r = interest_rate
    sigma = volatility
    
    d1 = (math.log(spot / strike) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    
    if option_type.upper() == 'CE':
        premium = spot * norm_cdf(d1) - strike * math.exp(-r * T) * norm_cdf(d2)
    else:  # PE
        premium = strike * math.exp(-r * T) * norm_cdf(-d2) - spot * norm_cdf(-d1)
        
    return max(0.50, round(premium, 2))  # minimum tick size 0.50

def get_strike_step(spot: float) -> float:
    """Determines realistic strike price intervals based on the underlying spot price."""
    if spot > 50000:
        return 500.0
    elif spot > 10000:
        return 100.0
    elif spot > 5000:
        return 50.0
    elif spot > 1000:
        return 20.0
    elif spot > 500:
        return 10.0
    elif spot > 100:
        return 5.0
    else:
        return 2.5

def get_strikes_for_underlying(spot: float) -> List[float]:
    """Generates 5 dynamic option strike prices centered around the underlying's spot price."""
    step = get_strike_step(spot)
    atm = round(spot / step) * step
    strikes = [atm - 2 * step, atm - step, atm, atm + step, atm + 2 * step]
    return [round(s, 2) for s in strikes]

# Options Lot Sizes mappings
LOT_SIZES = {
    "NIFTY50": 50,
    "SENSEX": 10,
    "BANKNIFTY": 15,
    "NIFTYIT": 50,
    "SP500": 10,
    "NASDAQ": 10,
    "DOW": 10,
    "FTSE100": 10,
    "NIKKEI": 100,
    "AAPL": 100,
    "MSFT": 100,
    "NVDA": 100,
    "GOOGL": 100,
    "AMZN": 100,
    "TSLA": 100,
    "META": 100,
}

class TicksDict(dict):
    def __init__(self, simulator):
        super().__init__()
        self.simulator = simulator

    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        
        # Check if it's an option symbol
        parts = key.split("_")
        if len(parts) == 3 and parts[2] in ["CE", "PE"]:
            underlying = parts[0]
            try:
                strike = float(parts[1])
                option_type = parts[2]
            except ValueError:
                raise KeyError(key)
                
            if underlying in self.simulator.stocks:
                u_tick = self[underlying]
                spot = u_tick["price"]
                now = datetime.datetime.now()
                timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
                
                premium = calculate_option_premium(spot, strike, option_type)
                
                u_prev_close = spot - u_tick["change"]
                prev_premium = calculate_option_premium(u_prev_close, strike, option_type)
                
                change = premium - prev_premium
                change_pct = (change / prev_premium) * 100 if prev_premium > 0 else 0.0
                
                open_premium = calculate_option_premium(u_tick["open"], strike, option_type)
                if option_type == "CE":
                    high_premium = calculate_option_premium(u_tick["high"], strike, option_type)
                    low_premium = calculate_option_premium(u_tick["low"], strike, option_type)
                else:
                    high_premium = calculate_option_premium(u_tick["low"], strike, option_type)
                    low_premium = calculate_option_premium(u_tick["high"], strike, option_type)
                    
                opt_tick = {
                    "symbol": key,
                    "name": f"{underlying} {strike:g} {option_type}",
                    "price": premium,
                    "change": round(change, 2),
                    "change_percent": round(change_pct, 2),
                    "open": round(open_premium, 2),
                    "high": round(high_premium, 2),
                    "low": round(low_premium, 2),
                    "close": premium,
                    "volume": max(0, u_tick["volume"] // 10),
                    "timestamp": timestamp_str
                }
                self[key] = opt_tick
                return opt_tick
        raise KeyError(key)

# Configure genuine stocks and benchmark indices mapped to Yahoo Finance symbols
STOCK_CONFIG = {
    # --- Indian Market Indices ---
    "NIFTY50": {"name": "Nifty 50 Index (NSE)", "ticker": "^NSEI", "base": 22500.0, "volatility": 0.0004},
    "SENSEX": {"name": "SENSEX Index (BSE)", "ticker": "^BSESN", "base": 74200.0, "volatility": 0.0004},
    "BANKNIFTY": {"name": "Nifty Bank Index (NSE)", "ticker": "^NSEBANK", "base": 48500.0, "volatility": 0.0006},
    "NIFTYIT": {"name": "Nifty IT Index (NSE)", "ticker": "^CNXIT", "base": 38200.0, "volatility": 0.0007},
    
    # --- Major US/Global Market Indices ---
    "SP500": {"name": "S&P 500 Index (US)", "ticker": "^GSPC", "base": 5100.0, "volatility": 0.0004},
    "NASDAQ": {"name": "NASDAQ Composite (US)", "ticker": "^IXIC", "base": 16000.0, "volatility": 0.0006},
    "DOW": {"name": "Dow Jones Industrial (US)", "ticker": "^DJI", "base": 39000.0, "volatility": 0.0003},
    "FTSE100": {"name": "FTSE 100 Index (London)", "ticker": "^FTSE", "base": 7900.0, "volatility": 0.0005},
    "NIKKEI": {"name": "Nikkei 225 Index (Tokyo)", "ticker": "^N225", "base": 38000.0, "volatility": 0.0006},

    # --- Indian Equities ---
    "RELIANCE": {"name": "Reliance Industries Ltd.", "ticker": "RELIANCE.NS", "base": 2450.0, "volatility": 0.001},
    "TCS": {"name": "Tata Consultancy Services Ltd.", "ticker": "TCS.NS", "base": 3400.0, "volatility": 0.0008},
    "INFY": {"name": "Infosys Ltd.", "ticker": "INFY.NS", "base": 1420.0, "volatility": 0.0012},
    "HDFCBANK": {"name": "HDFC Bank Ltd.", "ticker": "HDFCBANK.NS", "base": 1600.0, "volatility": 0.0007},
    "ICICIBANK": {"name": "ICICI Bank Ltd.", "ticker": "ICICIBANK.NS", "base": 930.0, "volatility": 0.0009},
    "TATASTEEL": {"name": "Tata Steel Ltd.", "ticker": "TATASTEEL.NS", "base": 115.0, "volatility": 0.0018},
    "SBIN": {"name": "State Bank of India", "ticker": "SBIN.NS", "base": 570.0, "volatility": 0.0011},
    "BHARTIARTL": {"name": "Bharti Airtel Ltd.", "ticker": "BHARTIARTL.NS", "base": 820.0, "volatility": 0.001},
    "ITC": {"name": "ITC Ltd.", "ticker": "ITC.NS", "base": 440.0, "volatility": 0.0009},
    "LTIM": {"name": "LTI Mindtree Ltd.", "ticker": "LTIM.NS", "base": 4900.0, "volatility": 0.0014},
    
    # --- US/Global Blue-Chip Equities ---
    "AAPL": {"name": "Apple Inc.", "ticker": "AAPL", "base": 170.0, "volatility": 0.0012},
    "MSFT": {"name": "Microsoft Corp.", "ticker": "MSFT", "base": 420.0, "volatility": 0.001},
    "NVDA": {"name": "NVIDIA Corp.", "ticker": "NVDA", "base": 900.0, "volatility": 0.0022},
    "GOOGL": {"name": "Alphabet Inc. (Google)", "ticker": "GOOGL", "base": 150.0, "volatility": 0.0013},
    "AMZN": {"name": "Amazon.com Inc.", "ticker": "AMZN", "base": 180.0, "volatility": 0.0014},
    "TSLA": {"name": "Tesla Inc.", "ticker": "TSLA", "base": 175.0, "volatility": 0.0025},
    "META": {"name": "Meta Platforms Inc. (Facebook)", "ticker": "META", "base": 500.0, "volatility": 0.0018},

    # --- Global Forex Markets (Majors, Minors, Exotics) ---
    "EURUSD": {"name": "EUR/USD", "ticker": "EURUSD=X", "base": 1.08, "volatility": 0.0003},
    "GBPUSD": {"name": "GBP/USD", "ticker": "GBPUSD=X", "base": 1.27, "volatility": 0.0004},
    "USDJPY": {"name": "USD/JPY", "ticker": "JPY=X", "base": 150.50, "volatility": 0.0005},
    "USDCHF": {"name": "USD/CHF", "ticker": "CHF=X", "base": 0.88, "volatility": 0.0003},
    "USDCAD": {"name": "USD/CAD", "ticker": "CAD=X", "base": 1.35, "volatility": 0.0003},
    "AUDUSD": {"name": "AUD/USD", "ticker": "AUDUSD=X", "base": 0.65, "volatility": 0.0004},
    "NZDUSD": {"name": "NZD/USD", "ticker": "NZDUSD=X", "base": 0.61, "volatility": 0.0004},
    
    # Minors
    "EURGBP": {"name": "EUR/GBP", "ticker": "EURGBP=X", "base": 0.85, "volatility": 0.0002},
    "EURJPY": {"name": "EUR/JPY", "ticker": "EURJPY=X", "base": 162.50, "volatility": 0.0005},
    "EURCHF": {"name": "EUR/CHF", "ticker": "EURCHF=X", "base": 0.95, "volatility": 0.0002},
    "EURCAD": {"name": "EUR/CAD", "ticker": "EURCAD=X", "base": 1.46, "volatility": 0.0003},
    "EURAUD": {"name": "EUR/AUD", "ticker": "EURAUD=X", "base": 1.66, "volatility": 0.0004},
    "EURNZD": {"name": "EUR/NZD", "ticker": "EURNZD=X", "base": 1.77, "volatility": 0.0004},
    "GBPJPY": {"name": "GBP/JPY", "ticker": "GBPJPY=X", "base": 190.50, "volatility": 0.0006},
    "GBPCHF": {"name": "GBP/CHF", "ticker": "GBPCHF=X", "base": 1.12, "volatility": 0.0003},
    "GBPCAD": {"name": "GBP/CAD", "ticker": "GBPCAD=X", "base": 1.72, "volatility": 0.0004},
    "GBPAUD": {"name": "GBP/AUD", "ticker": "GBPAUD=X", "base": 1.95, "volatility": 0.0005},
    "GBPNZD": {"name": "GBP/NZD", "ticker": "GBPNZD=X", "base": 2.08, "volatility": 0.0005},
    "AUDJPY": {"name": "AUD/JPY", "ticker": "AUDJPY=X", "base": 98.00, "volatility": 0.0005},
    "AUDCHF": {"name": "AUD/CHF", "ticker": "AUDCHF=X", "base": 0.57, "volatility": 0.0003},
    "AUDCAD": {"name": "AUD/CAD", "ticker": "AUDCAD=X", "base": 0.88, "volatility": 0.0003},
    "AUDNZD": {"name": "AUD/NZD", "ticker": "AUDNZD=X", "base": 1.06, "volatility": 0.0002},
    "NZDJPY": {"name": "NZD/JPY", "ticker": "NZDJPY=X", "base": 91.50, "volatility": 0.0005},
    "NZDCHF": {"name": "NZD/CHF", "ticker": "NZDCHF=X", "base": 0.53, "volatility": 0.0003},
    "NZDCAD": {"name": "NZD/CAD", "ticker": "NZDCAD=X", "base": 0.82, "volatility": 0.0003},
    "CADJPY": {"name": "CAD/JPY", "ticker": "CADJPY=X", "base": 111.50, "volatility": 0.0005},
    "CADCHF": {"name": "CAD/CHF", "ticker": "CADCHF=X", "base": 0.65, "volatility": 0.0003},
    "CHFJPY": {"name": "CHF/JPY", "ticker": "CHFJPY=X", "base": 171.00, "volatility": 0.0004},

    # Exotics
    "USDINR": {"name": "USD/INR", "ticker": "INR=X", "base": 83.20, "volatility": 0.0002},
    "USDSGD": {"name": "USD/SGD", "ticker": "SGD=X", "base": 1.34, "volatility": 0.0002},
    "USDHKD": {"name": "USD/HKD", "ticker": "HKD=X", "base": 7.82, "volatility": 0.0001},
    "USDZAR": {"name": "USD/ZAR", "ticker": "ZAR=X", "base": 18.50, "volatility": 0.0010},
    "USDMXN": {"name": "USD/MXN", "ticker": "MXN=X", "base": 17.10, "volatility": 0.0008},
    "USDTRY": {"name": "USD/TRY", "ticker": "TRY=X", "base": 31.00, "volatility": 0.0015},
    "USDSEK": {"name": "USD/SEK", "ticker": "SEK=X", "base": 10.30, "volatility": 0.0004},
    "USDNOK": {"name": "USD/NOK", "ticker": "NOK=X", "base": 10.50, "volatility": 0.0004},
    "USDDKK": {"name": "USD/DKK", "ticker": "DKK=X", "base": 6.85, "volatility": 0.0003},
    "USDCNY": {"name": "USD/CNY", "ticker": "CNY=X", "base": 7.20, "volatility": 0.0002},
    "USDKRW": {"name": "USD/KRW", "ticker": "KRW=X", "base": 1330.00, "volatility": 0.0005},
    "EURTRY": {"name": "EUR/TRY", "ticker": "EURTRY=X", "base": 33.50, "volatility": 0.0015},
    "EURSEK": {"name": "EUR/SEK", "ticker": "EURSEK=X", "base": 11.20, "volatility": 0.0004},
    "EURNOK": {"name": "EUR/NOK", "ticker": "EURNOK=X", "base": 11.40, "volatility": 0.0004},
}

class MarketSimulator:
    def __init__(self):
        self.stocks = {}
        self.candles = {}  # { symbol: { "1m": [], "5m": [], "1d": [], "1mo": [], "1y": [], "max": [] } }
        self.current_ticks = TicksDict(self)  # { symbol: latest_tick }
        self.reference_prices = {}  # { symbol: latest genuine Yahoo Finance price }
        self.failed_symbols = set()  # Tracks tickers that fail/delist to avoid log spam
        self.is_fluctuating = True
        self.exchange_rates = {
            "USD": 95.62,
            "GBP": 106.0,
            "JPY": 0.55,
            "INR": 1.0
        }
        self.initialize_mock_market()
        self.start_background_init()
        self.start_background_poller()

    def generate_random_walk(self, start_price: float, volatility: float) -> float:
        """Simulates price movement using a random walk with slight upward bias."""
        change_pct = random.normalvariate(0.00005, volatility)
        return start_price * (1.0 + change_pct)

    def initialize_mock_market(self):
        """Instantly pre-populates the market with mock data so the server can boot in milliseconds."""
        print("Initializing market with fast fallback data to allow immediate server boot...")
        now = datetime.datetime.now()
        for symbol, info in STOCK_CONFIG.items():
            self.candles[symbol] = {
                "1m": [], "5m": [], "1d": [], "1mo": [], "1y": [], "max": []
            }
            self._generate_fallback_candles(symbol, info, now)
            
            latest_close = self.candles[symbol]["1m"][-1]["close"]
            daily_open = self.candles[symbol]["1d"][-1]["open"]
            daily_close_prev = self.candles[symbol]["1d"][-2]["close"] if len(self.candles[symbol]["1d"]) > 1 else daily_open
            
            change = latest_close - daily_close_prev
            change_pct = (change / daily_close_prev) * 100 if daily_close_prev > 0 else 0.0
            
            self.current_ticks[symbol] = {
                "symbol": symbol,
                "name": info["name"],
                "price": latest_close,
                "change": round(change, 2),
                "change_percent": round(change_pct, 2),
                "open": daily_open,
                "high": max([c["high"] for c in self.candles[symbol]["1m"][-60:]]) if self.candles[symbol]["1m"] else latest_close,
                "low": min([c["low"] for c in self.candles[symbol]["1m"][-60:]]) if self.candles[symbol]["1m"] else latest_close,
                "close": latest_close,
                "volume": sum([c["volume"] for c in self.candles[symbol]["1m"][-60:]]) if self.candles[symbol]["1m"] else 0,
                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
            }
            self.stocks[symbol] = latest_close
            self.reference_prices[symbol] = latest_close

    def start_background_init(self):
        """Starts a background thread to download real Yahoo Finance data without blocking startup."""
        thread = threading.Thread(target=self._background_yfinance_download, daemon=True)
        thread.start()

    def _background_yfinance_download(self):
        """Downloads historical data in the background and gracefully replaces mock data using batched downloads."""
        print("Starting batch background download of real Yahoo Finance data...")
        now = datetime.datetime.now()
        
        # Initialize real-time exchange rates from Yahoo Finance
        try:
            rate_tickers = yf.download(tickers="USDINR=X GBPINR=X JPYINR=X", period="1d", interval="1m", group_by="ticker", progress=False)
            for currency, ticker in [("USD", "USDINR=X"), ("GBP", "GBPINR=X"), ("JPY", "JPYINR=X")]:
                if ticker in rate_tickers:
                    ticker_df = rate_tickers[ticker].dropna(subset=['Close'])
                    if not ticker_df.empty:
                        latest_rate = float(ticker_df.iloc[-1]['Close'])
                        if latest_rate > 0:
                            self.exchange_rates[currency] = round(latest_rate, 4)
            print(f"Real-time exchange rates loaded successfully: {self.exchange_rates}")
        except Exception as rate_ex:
            print(f"Failed to load real-time exchange rates on background init: {rate_ex}.")

        tickers_list = [info["ticker"] for symbol, info in STOCK_CONFIG.items()]
        tickers_str = " ".join(tickers_list)

        try:
            print("Batch downloading 1d candles...")
            df_1d_batch = yf.download(tickers=tickers_str, period="1y", interval="1d", group_by="ticker", progress=False)
            print("Batch downloading 5m candles...")
            df_5m_batch = yf.download(tickers=tickers_str, period="5d", interval="5m", group_by="ticker", progress=False)
            print("Batch downloading 1m candles...")
            df_1m_batch = yf.download(tickers=tickers_str, period="1d", interval="1m", group_by="ticker", progress=False)
            print("Batch downloading 1mo candles...")
            df_1mo_batch = yf.download(tickers=tickers_str, period="max", interval="1mo", group_by="ticker", progress=False)
            print("Batch downloading max weekly candles...")
            df_max_batch = yf.download(tickers=tickers_str, period="max", interval="1wk", group_by="ticker", progress=False)
        except Exception as e:
            print(f"Batch yfinance download failed entirely: {e}. Keeping mock data.")
            return

        is_multiindex = isinstance(df_1d_batch.columns, pd.MultiIndex)

        for symbol, info in STOCK_CONFIG.items():
            yahoo_symbol = info["ticker"]
            success = False
            temp_candles = { "1m": [], "5m": [], "1d": [], "1mo": [], "1y": [], "max": [] }
            
            try:
                if is_multiindex:
                    if yahoo_symbol in df_1d_batch:
                        df_1d = df_1d_batch[yahoo_symbol]
                        df_5m = df_5m_batch[yahoo_symbol]
                        df_1m = df_1m_batch[yahoo_symbol]
                        df_1mo = df_1mo_batch[yahoo_symbol]
                        df_max = df_max_batch[yahoo_symbol]
                    else:
                        raise ValueError(f"{yahoo_symbol} missing from batch")
                else:
                    df_1d = df_1d_batch
                    df_5m = df_5m_batch
                    df_1m = df_1m_batch
                    df_1mo = df_1mo_batch
                    df_max = df_max_batch
                
                if not df_1d.empty and not df_5m.empty and not df_1m.empty and not df_1mo.empty and not df_max.empty:
                    df_1d = df_1d.dropna(subset=['Close'])
                    for idx, row in df_1d.iterrows():
                        temp_candles["1d"].append({
                            "time": idx.strftime("%Y-%m-%d"),
                            "open": round(float(row['Open']), 2), "high": round(float(row['High']), 2),
                            "low": round(float(row['Low']), 2), "close": round(float(row['Close']), 2),
                            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                        })

                    df_5m = df_5m.dropna(subset=['Close'])
                    for idx, row in df_5m.iterrows():
                        temp_candles["5m"].append({
                            "time": idx.strftime("%Y-%m-%d %H:%M:%S"),
                            "open": round(float(row['Open']), 2), "high": round(float(row['High']), 2),
                            "low": round(float(row['Low']), 2), "close": round(float(row['Close']), 2),
                            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                        })

                    df_1m = df_1m.dropna(subset=['Close'])
                    for idx, row in df_1m.iterrows():
                        temp_candles["1m"].append({
                            "time": idx.strftime("%Y-%m-%d %H:%M:%S"),
                            "open": round(float(row['Open']), 2), "high": round(float(row['High']), 2),
                            "low": round(float(row['Low']), 2), "close": round(float(row['Close']), 2),
                            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                        })

                    df_1mo = df_1mo.dropna(subset=['Close'])
                    for idx, row in df_1mo.iterrows():
                        temp_candles["1mo"].append({
                            "time": idx.strftime("%Y-%m-%d"),
                            "open": round(float(row['Open']), 2), "high": round(float(row['High']), 2),
                            "low": round(float(row['Low']), 2), "close": round(float(row['Close']), 2),
                            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                        })

                    df_1y = df_1mo.groupby(df_1mo.index.year).agg({'Open': 'first', 'High': 'max', 'Low': 'min', 'Close': 'last', 'Volume': 'sum'})
                    for year, row in df_1y.iterrows():
                        temp_candles["1y"].append({
                            "time": f"{year}-01-01",
                            "open": round(float(row['Open']), 2), "high": round(float(row['High']), 2),
                            "low": round(float(row['Low']), 2), "close": round(float(row['Close']), 2),
                            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                        })

                    df_max = df_max.dropna(subset=['Close'])
                    for idx, row in df_max.iterrows():
                        temp_candles["max"].append({
                            "time": idx.strftime("%Y-%m-%d"),
                            "open": round(float(row['Open']), 2), "high": round(float(row['High']), 2),
                            "low": round(float(row['Low']), 2), "close": round(float(row['Close']), 2),
                            "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                        })
                    
                    if len(temp_candles["1m"]) > 0:
                        success = True
                        print(f"[{symbol}] Successfully mapped batched yfinance data.")
            except Exception as e:
                print(f"[{symbol}] Failed to map batched yfinance data: {e}")
            
            if success:
                self.failed_symbols.discard(symbol)
                self.candles[symbol] = temp_candles
                
                latest_close = self.candles[symbol]["1m"][-1]["close"]
                daily_open = self.candles[symbol]["1d"][-1]["open"] if self.candles[symbol]["1d"] else latest_close
                daily_close_prev = self.candles[symbol]["1d"][-2]["close"] if len(self.candles[symbol]["1d"]) > 1 else daily_open
                
                change = latest_close - daily_close_prev
                change_pct = (change / daily_close_prev) * 100 if daily_close_prev > 0 else 0.0
                
                self.current_ticks[symbol] = {
                    "symbol": symbol, "name": info["name"], "price": latest_close,
                    "change": round(change, 2), "change_percent": round(change_pct, 2),
                    "open": daily_open, "high": max([c["high"] for c in self.candles[symbol]["1m"][-60:]]),
                    "low": min([c["low"] for c in self.candles[symbol]["1m"][-60:]]), "close": latest_close,
                    "volume": sum([c["volume"] for c in self.candles[symbol]["1m"][-60:]]),
                    "timestamp": now.strftime("%Y-%m-%d %H:%M:%S")
                }
                self.stocks[symbol] = latest_close
                self.reference_prices[symbol] = latest_close
            else:
                self.failed_symbols.add(symbol)

    def _generate_fallback_candles(self, symbol: str, info: Dict[str, Any], now: datetime.datetime):
        """Generates fallback historical candles if yfinance download fails."""
        base_price = info.get("base", 100.0)
        volatility = info["volatility"]
        
        # --- 1. Pre-generate Daily (1d) Candles (100 days) ---
        current_price = base_price
        start_date = now - datetime.timedelta(days=100)
        for i in range(100):
            candle_date = start_date + datetime.timedelta(days=i)
            # Skip weekends for realistic feel
            if candle_date.weekday() >= 5:
                continue
            o = current_price
            h = o * (1 + abs(random.normalvariate(0.01, volatility * 5)))
            l = o * (1 - abs(random.normalvariate(0.01, volatility * 5)))
            c = random.uniform(l, h)
            v = int(random.uniform(50000, 500000))
            
            self.candles[symbol]["1d"].append({
                "time": candle_date.strftime("%Y-%m-%d"),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            })
            current_price = c

        # --- 2. Pre-generate 5-Minute (5m) Candles (100 bars) ---
        current_price = base_price
        start_time_5m = now - datetime.timedelta(minutes=500)
        for i in range(100):
            candle_time = start_time_5m + datetime.timedelta(minutes=5 * i)
            o = current_price
            h = o * (1 + abs(random.normalvariate(0.002, volatility * 2)))
            l = o * (1 - abs(random.normalvariate(0.002, volatility * 2)))
            c = random.uniform(l, h)
            v = int(random.uniform(5000, 50000))
            
            self.candles[symbol]["5m"].append({
                "time": candle_time.strftime("%Y-%m-%d %H:%M:%S"),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            })
            current_price = c

        # --- 3. Pre-generate 1-Minute (1m) Candles (100 bars) ---
        current_price = base_price
        start_time_1m = now - datetime.timedelta(minutes=100)
        for i in range(100):
            candle_time = start_time_1m + datetime.timedelta(minutes=i)
            o = current_price
            h = o * (1 + abs(random.normalvariate(0.001, volatility)))
            l = o * (1 - abs(random.normalvariate(0.001, volatility)))
            c = random.uniform(l, h)
            v = int(random.uniform(1000, 10000))
            
            self.candles[symbol]["1m"].append({
                "time": candle_time.strftime("%Y-%m-%d %H:%M:%S"),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            })
            current_price = c

        # --- 4. Pre-generate Monthly (1mo) Fallback Candles (60 months) ---
        current_price = base_price
        start_date = now - datetime.timedelta(days=30 * 60)
        for i in range(60):
            candle_date = start_date + datetime.timedelta(days=30 * i)
            o = current_price
            h = o * (1 + abs(random.normalvariate(0.05, volatility * 15)))
            l = o * (1 - abs(random.normalvariate(0.05, volatility * 15)))
            c = random.uniform(l, h)
            v = int(random.uniform(500000, 5000000))
            
            self.candles[symbol]["1mo"].append({
                "time": candle_date.strftime("%Y-%m-%d"),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            })
            current_price = c

        # --- 5. Pre-generate Yearly (1y) Fallback Candles (10 years) ---
        current_price = base_price
        start_date = now - datetime.timedelta(days=365 * 10)
        for i in range(10):
            candle_date = start_date + datetime.timedelta(days=365 * i)
            o = current_price
            h = o * (1 + abs(random.normalvariate(0.15, volatility * 35)))
            l = o * (1 - abs(random.normalvariate(0.15, volatility * 35)))
            c = random.uniform(l, h)
            v = int(random.uniform(5000000, 50000000))
            
            self.candles[symbol]["1y"].append({
                "time": f"{candle_date.year}-01-01",
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            })
            current_price = c

        # --- 6. Pre-generate Max Lifetime Weekly Fallback Candles (150 weeks) ---
        current_price = base_price
        start_date = now - datetime.timedelta(days=7 * 150)
        for i in range(150):
            candle_date = start_date + datetime.timedelta(days=7 * i)
            o = current_price
            h = o * (1 + abs(random.normalvariate(0.02, volatility * 8)))
            l = o * (1 - abs(random.normalvariate(0.02, volatility * 8)))
            c = random.uniform(l, h)
            v = int(random.uniform(200000, 2000000))
            
            self.candles[symbol]["max"].append({
                "time": candle_date.strftime("%Y-%m-%d"),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            })
            current_price = c

    def start_background_poller(self):
        """Starts a background thread to poll latest Yahoo Finance prices every 15 seconds."""
        thread = threading.Thread(target=self._polling_loop, daemon=True)
        thread.start()

    def _polling_loop(self):
        """Background polling loop executing batched Yahoo Finance downloads."""
        print("Starting Yahoo Finance background poller thread...")
        while True:
            try:
                # Wait 15 seconds between queries to prevent Yahoo rate-limiting
                time.sleep(15)
                self.fetch_latest_prices()
            except Exception as e:
                print(f"Error in Yahoo Finance background poller: {e}")

    def fetch_latest_prices(self):
        """Downloads the latest ticking prices and exchange rates from Yahoo Finance in one single batched call."""
        tickers_list = [info["ticker"] for symbol, info in STOCK_CONFIG.items() if symbol not in self.failed_symbols]
        rate_tickers = ["USDINR=X", "GBPINR=X", "JPYINR=X"]
        tickers_list.extend(rate_tickers)
        if not tickers_list:
            return
        tickers_str = " ".join(tickers_list)
        
        try:
            # Batch download 1-day, 1-minute period for all configured tickers
            df = yf.download(tickers=tickers_str, period="1d", interval="1m", group_by="ticker", progress=False)
            
            for symbol, info in STOCK_CONFIG.items():
                ticker_symbol = info["ticker"]
                try:
                    ticker_df = df[ticker_symbol].dropna(subset=['Close'])
                    if not ticker_df.empty:
                        latest_price = float(ticker_df.iloc[-1]['Close'])
                        if latest_price > 0:
                            self.reference_prices[symbol] = latest_price
                except Exception as inner_ex:
                    # Ignore failures for specific tickers inside the batched result
                    pass
            
            # Extract and update rates
            for currency, ticker in [("USD", "USDINR=X"), ("GBP", "GBPINR=X"), ("JPY", "JPYINR=X")]:
                try:
                    ticker_df = df[ticker].dropna(subset=['Close'])
                    if not ticker_df.empty:
                        latest_rate = float(ticker_df.iloc[-1]['Close'])
                        if latest_rate > 0:
                            self.exchange_rates[currency] = round(latest_rate, 4)
                except Exception:
                    pass
        except Exception as e:
            print(f"Batched Yahoo Finance update failed: {e}. Keeping cached prices.")

    def tick(self) -> Dict[str, Any]:
        """Runs a simulation tick (1-second update). Updates candles and returns the ticks list."""
        if not getattr(self, 'is_fluctuating', True):
            ticks = {}
            for symbol in list(self.stocks.keys()):
                ticks[symbol] = self.current_ticks[symbol].copy()
                spot = self.stocks[symbol]
                strikes = get_strikes_for_underlying(spot)
                for strike in strikes:
                    for option_type in ["CE", "PE"]:
                        opt_symbol = f"{symbol}_{strike:g}_{option_type}"
                        ticks[opt_symbol] = self.current_ticks[opt_symbol]
            return ticks

        now = datetime.datetime.now()
        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
        ticks = {}

        # Clear previous cached option ticks so they are recalculated with fresh spot prices
        keys_to_delete = [k for k in self.current_ticks.keys() if "_" in k]
        for k in keys_to_delete:
            del self.current_ticks[k]

        for symbol, current_price in self.stocks.items():
            # Retrieve latest genuine reference price from Yahoo Finance cache
            ref_price = self.reference_prices.get(symbol, current_price)
            
            # Gravitate slightly toward the true yfinance price while keeping high frequency blinking animations
            volatility = STOCK_CONFIG[symbol]["volatility"]
            deviation = (ref_price - current_price) / current_price if current_price > 0 else 0
            bias = deviation * 0.1  # mean-revert 10% toward true price per second
            
            change_pct = bias + random.normalvariate(0, volatility)
            # Clip bounds to keep ticking updates sane
            change_pct = max(-0.001, min(0.001, change_pct))
            
            new_price = round(current_price * (1.0 + change_pct), 2)
            self.stocks[symbol] = new_price
            
            # Extract historical daily close of previous day to calculate accurate daily changes
            if len(self.candles[symbol]["1d"]) > 1:
                prev_day_close = self.candles[symbol]["1d"][-2]["close"]
            else:
                prev_day_close = self.candles[symbol]["1d"][-1]["open"] if self.candles[symbol]["1d"] else ref_price
                
            change = new_price - prev_day_close
            change_pct = (change / prev_day_close) * 100 if prev_day_close > 0 else 0.0
            
            tick_data = self.current_ticks[symbol]
            tick_data["price"] = new_price
            tick_data["change"] = round(change, 2)
            tick_data["change_percent"] = round(change_pct, 2)
            tick_data["timestamp"] = timestamp_str
            tick_data["volume"] += int(random.uniform(5, 50))
            
            if new_price > tick_data["high"]:
                tick_data["high"] = new_price
            if new_price < tick_data["low"]:
                tick_data["low"] = new_price
                
            ticks[symbol] = tick_data.copy()
            
            # --- Update Running Candles ---
            self._update_candle_list(symbol, "1m", new_price, now, 60)
            self._update_candle_list(symbol, "5m", new_price, now, 300)
            self._update_candle_list(symbol, "1d", new_price, now, 86400)
            self._update_candle_list(symbol, "1mo", new_price, now, 2592000)
            self._update_candle_list(symbol, "1y", new_price, now, 31536000)
            self._update_candle_list(symbol, "max", new_price, now, 604800)

        # Generate active option ticks for all base stocks to stream via WebSocket
        for symbol in list(self.stocks.keys()):
            spot = self.stocks[symbol]
            strikes = get_strikes_for_underlying(spot)
            for strike in strikes:
                for option_type in ["CE", "PE"]:
                    opt_symbol = f"{symbol}_{strike:g}_{option_type}"
                    # Accessing it via TicksDict __getitem__ automatically calculates and caches it
                    ticks[opt_symbol] = self.current_ticks[opt_symbol]

        return ticks

    def _update_candle_list(self, symbol: str, interval: str, price: float, now: datetime.datetime, seconds: int):
        """Updates the latest candle or adds a new one depending on elapsed time."""
        candles = self.candles[symbol][interval]
        if not candles:
            return
            
        last_candle = candles[-1]
        
        if interval in ["1d", "1mo", "1y", "max"]:
            try:
                last_time = datetime.datetime.strptime(last_candle["time"], "%Y-%m-%d")
            except ValueError:
                # If parsed format is timezone aware or has time info
                last_time = datetime.datetime.strptime(last_candle["time"].split(" ")[0], "%Y-%m-%d")
                
            if interval == "1d":
                is_new_period = now.date() != last_time.date()
            elif interval == "1mo":
                is_new_period = now.year != last_time.year or now.month != last_time.month
            elif interval == "1y":
                is_new_period = now.year != last_time.year
            else: # max (weekly)
                is_new_period = (now - last_time).days >= 7
                
            time_str = now.strftime("%Y-%m-%d")
        else:
            try:
                last_time = datetime.datetime.strptime(last_candle["time"], "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Fallback if there is trailing timezone info
                last_time = datetime.datetime.strptime(last_candle["time"][:19], "%Y-%m-%d %H:%M:%S")
            elapsed = (now - last_time).total_seconds()
            is_new_period = elapsed >= seconds
            time_str = now.strftime("%Y-%m-%d %H:%M:%S")
            
        if is_new_period:
            # Commit new candle
            new_candle = {
                "time": time_str,
                "open": last_candle["close"],
                "high": max(last_candle["close"], price),
                "low": min(last_candle["close"], price),
                "close": price,
                "volume": int(random.uniform(10, 100))
            }
            candles.append(new_candle)
            if len(candles) > 500:
                candles.pop(0)
        else:
            # Update current candle
            last_candle["close"] = price
            if price > last_candle["high"]:
                last_candle["high"] = price
            if price < last_candle["low"]:
                last_candle["low"] = price
            last_candle["volume"] += int(random.uniform(1, 10))

    def get_candles(self, symbol: str, interval: str) -> List[Dict[str, Any]]:
        """Returns the cloned historical candles list for a given symbol and interval (translating options dynamically)."""
        symbol = symbol.upper()
        parts = symbol.split("_")
        if len(parts) == 3 and parts[2] in ["CE", "PE"]:
            underlying = parts[0]
            try:
                strike = float(parts[1])
                option_type = parts[2]
            except ValueError:
                return []
            
            underlying_candles = self.get_candles(underlying, interval)
            if not underlying_candles:
                return []
                
            opt_candles = []
            for c in underlying_candles:
                open_val = c["open"]
                close_val = c["close"]
                high_val = c["high"]
                low_val = c["low"]
                
                o = calculate_option_premium(open_val, strike, option_type)
                c_val = calculate_option_premium(close_val, strike, option_type)
                
                if option_type == "CE":
                    h = calculate_option_premium(high_val, strike, option_type)
                    l = calculate_option_premium(low_val, strike, option_type)
                else:
                    h = calculate_option_premium(low_val, strike, option_type)
                    l = calculate_option_premium(high_val, strike, option_type)
                
                opt_candles.append({
                    "time": c["time"],
                    "open": round(o, 2),
                    "high": round(h, 2),
                    "low": round(l, 2),
                    "close": round(c_val, 2),
                    "volume": max(0, c["volume"] // 10)
                })
            return opt_candles
            
        if symbol not in self.candles or interval not in self.candles[symbol]:
            return []
        return [c.copy() for c in self.candles[symbol][interval]]

# Instantiate single global simulator
market_simulator = MarketSimulator()
