import math
from typing import List, Dict, Any, Optional

def calculate_sma(prices: List[float], period: int) -> List[Optional[float]]:
    """Calculates Simple Moving Average."""
    sma = [None] * len(prices)
    if len(prices) < period:
        return sma
    
    current_sum = sum(prices[:period])
    sma[period - 1] = current_sum / period
    
    for i in range(period, len(prices)):
        current_sum = current_sum - prices[i - period] + prices[i]
        sma[i] = current_sum / period
        
    return sma


def calculate_ema(prices: List[float], period: int) -> List[Optional[float]]:
    """Calculates Exponential Moving Average."""
    ema = [None] * len(prices)
    if len(prices) < period:
        return ema
    
    # First EMA value is the SMA of the first 'period' elements
    sma_first = sum(prices[:period]) / period
    ema[period - 1] = sma_first
    
    k = 2 / (period + 1)
    for i in range(period, len(prices)):
        ema[i] = prices[i] * k + ema[i - 1] * (1 - k)
        
    return ema


def calculate_rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
    """Calculates Relative Strength Index using Wilder's smoothing."""
    rsi = [None] * len(prices)
    if len(prices) <= period:
        return rsi
    
    gains = []
    losses = []
    
    # Calculate initial changes
    for i in range(1, len(prices)):
        change = prices[i] - prices[i - 1]
        if change > 0:
            gains.append(change)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(change))
            
    # Calculate first average gain and loss
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    if avg_loss == 0:
        rsi[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi[period] = 100.0 - (100.0 / (1.0 + rs))
        
    # Wilders smoothing for remaining items
    for i in range(period + 1, len(prices)):
        gain = gains[i - 1]
        loss = losses[i - 1]
        
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        if avg_loss == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[i] = 100.0 - (100.0 / (1.0 + rs))
            
    return rsi


def calculate_macd(
    prices: List[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9
) -> Dict[str, List[Optional[float]]]:
    """Calculates MACD Line, Signal Line, and MACD Histogram."""
    n = len(prices)
    macd_line = [None] * n
    signal_line = [None] * n
    histogram = [None] * n
    
    if n < slow_period:
        return {"macd": macd_line, "signal": signal_line, "histogram": histogram}
        
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    
    # Calculate MACD Line
    for i in range(slow_period - 1, n):
        if fast_ema[i] is not None and slow_ema[i] is not None:
            macd_line[i] = fast_ema[i] - slow_ema[i]
            
    # Calculate Signal Line (9-day EMA of MACD Line)
    # Extract only the non-None portion of macd_line
    valid_macd_indices = [i for i, x in enumerate(macd_line) if x is not None]
    if len(valid_macd_indices) >= signal_period:
        valid_macd_values = [macd_line[i] for i in valid_macd_indices]
        valid_signal = calculate_ema(valid_macd_values, signal_period)
        
        # Map signal line back to original indices
        for idx_in_valid, orig_idx in enumerate(valid_macd_indices):
            signal_line[orig_idx] = valid_signal[idx_in_valid]
            if macd_line[orig_idx] is not None and signal_line[orig_idx] is not None:
                histogram[orig_idx] = macd_line[orig_idx] - signal_line[orig_idx]
                
    return {"macd": macd_line, "signal": signal_line, "histogram": histogram}


def calculate_bollinger_bands(
    prices: List[float], period: int = 20, num_std: float = 2.0
) -> Dict[str, List[Optional[float]]]:
    """Calculates Bollinger Bands (Upper, Middle, Lower)."""
    n = len(prices)
    upper_band = [None] * n
    middle_band = [None] * n
    lower_band = [None] * n
    
    if n < period:
        return {"upper": upper_band, "middle": middle_band, "lower": lower_band}
        
    middle_band = calculate_sma(prices, period)
    
    for i in range(period - 1, n):
        # Calculate standard deviation
        slice_prices = prices[i - period + 1 : i + 1]
        mean = middle_band[i]
        variance = sum((x - mean) ** 2 for x in slice_prices) / period
        std_dev = math.sqrt(variance)
        
        upper_band[i] = mean + (num_std * std_dev)
        lower_band[i] = mean - (num_std * std_dev)
        
    return {"upper": upper_band, "middle": middle_band, "lower": lower_band}


def add_all_indicators(candles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enriches candles list with computed indicator keys."""
    if not candles:
        return candles
        
    closes = [c["close"] for c in candles]
    
    sma_20 = calculate_sma(closes, 20)
    ema_9 = calculate_ema(closes, 9)
    ema_21 = calculate_ema(closes, 21)
    rsi_14 = calculate_rsi(closes, 14)
    macd_data = calculate_macd(closes)
    bb_data = calculate_bollinger_bands(closes)
    
    for i, candle in enumerate(candles):
        candle["sma_20"] = sma_20[i]
        candle["ema_9"] = ema_9[i]
        candle["ema_21"] = ema_21[i]
        candle["rsi_14"] = rsi_14[i]
        candle["macd_line"] = macd_data["macd"][i]
        candle["macd_signal"] = macd_data["signal"][i]
        candle["macd_hist"] = macd_data["histogram"][i]
        candle["bb_upper"] = bb_data["upper"][i]
        candle["bb_middle"] = bb_data["middle"][i]
        candle["bb_lower"] = bb_data["lower"][i]
        
    return candles
