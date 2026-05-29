import pytest
from indicators import calculate_sma, calculate_ema, calculate_rsi, calculate_macd, calculate_bollinger_bands

def test_indicators_math():
    # Setup test price array (increasing prices)
    prices = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0]
    
    # 1. Test SMA (period 5)
    sma = calculate_sma(prices, 5)
    # The first 4 elements should be None
    assert sma[0] is None
    assert sma[3] is None
    # 5th element: (10 + 11 + 12 + 13 + 14) / 5 = 12.0
    assert sma[4] == 12.0
    # 6th element: (11 + 12 + 13 + 14 + 15) / 5 = 13.0
    assert sma[5] == 13.0

    # 2. Test EMA (period 3)
    ema = calculate_ema(prices, 3)
    assert ema[0] is None
    assert ema[1] is None
    # 3rd element: SMA of first 3 = (10 + 11 + 12) / 3 = 11.0
    assert ema[2] == 11.0
    # 4th element: 13.0 * (2/4) + 11.0 * (1 - 2/4) = 12.0
    assert ema[3] == 12.0

    # 3. Test RSI (period 5)
    # Price steps constant gains (+1 each step) -> RSI should approach 100
    rsi = calculate_rsi(prices, 5)
    assert rsi[0] is None
    assert rsi[4] is None
    # Gains are 1.0, losses are 0.0 -> RSI is 100.0
    assert rsi[5] == 100.0

    # 4. Test Bollinger Bands (period 5)
    bb = calculate_bollinger_bands(prices, 5)
    assert bb["middle"][4] == 12.0
    assert bb["upper"][4] > 12.0
    assert bb["lower"][4] < 12.0

    print("All indicator calculations assertions passed successfully!")

if __name__ == "__main__":
    test_indicators_math()
