import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Star, TrendingUp, TrendingDown, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { apiService, getCurrencySymbol } from '../utils/api';
import InteractiveChart from '../components/InteractiveChart';
import OrderModal from '../components/OrderModal';

export default function StockDetailScreen({ onBack }) {
  const { activeStockSymbol, setActiveStockSymbol, liveTicks, watchlist, toggleWatchlist, theme } = useApp();
  const [candles, setCandles] = useState([]);
  const [activeInterval, setActiveInterval] = useState('1m');
  const [loading, setLoading] = useState(true);
  const [tradeModal, setTradeModal] = useState(null); // { type: 'BUY' | 'SELL', symbol: string, price: number } | null
  const [activeTab, setActiveTab] = useState('TECHNICAL INFO'); // 'TECHNICAL INFO' | 'OPTION CHAIN'

  const parts = activeStockSymbol.split('_');
  const isOptionSymbol = parts.length === 3 && (parts[2] === 'CE' || parts[2] === 'PE');

  const handleBackPress = () => {
    if (isOptionSymbol) {
      // Go back to the underlying stock page
      setActiveStockSymbol(parts[0]);
    } else {
      onBack();
    }
  };

  // Market Depth mockup queues
  const [marketDepth, setMarketDepth] = useState({ bids: [], asks: [] });

  // Load candle data from API
  const loadHistory = async (symbol, interval) => {
    setLoading(true);
    try {
      const data = await apiService.getStockHistory(symbol, interval);
      setCandles(data);
    } catch (e) {
      console.error('Failed to load stock history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(activeStockSymbol, activeInterval);
  }, [activeStockSymbol, activeInterval]);

  // Generate and tick fluctuating Bid/Ask queues (Market Depth)
  useEffect(() => {
    if (!liveTicks[activeStockSymbol]) return;
    const currentPrice = liveTicks[activeStockSymbol].price;

    const generateDepth = () => {
      const bids = [];
      const asks = [];
      let bidTotal = 0;
      let askTotal = 0;

      // 5 layers of bid orderbooks
      for (let i = 1; i <= 5; i++) {
        const p = currentPrice - i * (currentPrice * 0.0003);
        const q = Math.floor(randomBetween(100, 1500));
        bidTotal += q;
        bids.push({ price: p, qty: q, total: bidTotal });
      }

      // 5 layers of ask orderbooks
      for (let i = 1; i <= 5; i++) {
        const p = currentPrice + i * (currentPrice * 0.0003);
        const q = Math.floor(randomBetween(100, 1500));
        askTotal += q;
        asks.push({ price: p, qty: q, total: askTotal });
      }

      setMarketDepth({ bids, asks, bidTotal, askTotal });
    };

    generateDepth();
    // Re-fluctuate book sizes every 3 seconds
    const interval = setInterval(generateDepth, 3000);
    return () => clearInterval(interval);
  }, [activeStockSymbol, liveTicks[activeStockSymbol]]);

  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  const getStrikeStep = (spot) => {
    if (spot > 50000) return 500.0;
    if (spot > 10000) return 100.0;
    if (spot > 5000) return 50.0;
    if (spot > 1000) return 20.0;
    if (spot > 500) return 10.0;
    if (spot > 100) return 5.0;
    return 2.5;
  };

  const renderOptionChain = () => {
    if (!liveTick.price) {
      return (
        <View style={[styles.loaderBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.loaderText, { color: theme.textSecondary }]}>Loading option chain prices...</Text>
        </View>
      );
    }
    
    const spot = liveTick.price;
    const step = getStrikeStep(spot);
    const atm = Math.round(spot / step) * step;
    const strikes = [atm - 2 * step, atm - step, atm, atm + step, atm + 2 * step];

    return (
      <View style={[styles.optionChainCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.optionChainHeader, { borderColor: theme.border }]}>
          <Text style={[styles.optionChainTitle, { color: theme.text }]}>Option Chain Derivatives</Text>
          <Text style={[styles.optionChainSubtitle, { color: theme.accent }]}>Spot: {getCurrencySymbol(activeStockSymbol)}{spot.toFixed(2)}</Text>
        </View>
        
        {/* Table Headers */}
        <View style={[styles.tableHeaderRow, { borderColor: theme.border }]}>
          <View style={[styles.tableHeaderCol, { flex: 1.2, alignItems: 'flex-start' }]}>
            <Text style={[styles.tableHeaderLabel, { color: theme.textSecondary }]}>CALLS (CE)</Text>
          </View>
          <View style={[styles.tableHeaderCol, { flex: 0.8, alignItems: 'center' }]}>
            <Text style={[styles.tableHeaderLabel, { color: theme.textSecondary }]}>STRIKE</Text>
          </View>
          <View style={[styles.tableHeaderCol, { flex: 1.2, alignItems: 'flex-end' }]}>
            <Text style={[styles.tableHeaderLabel, { color: theme.textSecondary }]}>PUTS (PE)</Text>
          </View>
        </View>

        {/* Rows */}
        {strikes.map((strike, idx) => {
          const ceSymbol = `${activeStockSymbol}_${strike}_CE`;
          const peSymbol = `${activeStockSymbol}_${strike}_PE`;
          const ceTick = liveTicks[ceSymbol] || { price: 0, change_percent: 0 };
          const peTick = liveTicks[peSymbol] || { price: 0, change_percent: 0 };

          const ceIsUp = ceTick.change_percent >= 0;
          const peIsUp = peTick.change_percent >= 0;
          const isATM = strike === atm;

          return (
            <View key={`strike-${idx}`} style={[styles.strikeRow, { borderColor: theme.border }, isATM && styles.atmRowHighlight, isATM && { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
              {/* CE Premium Column (Clickable to open CE detail screen) */}
              <TouchableOpacity 
                style={[styles.optionCol, { flex: 1.2, alignItems: 'flex-start' }]}
                onPress={() => setActiveStockSymbol(ceSymbol)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.premiumPrice, { color: theme.text }]}>{getCurrencySymbol(ceSymbol)}{ceTick.price.toFixed(2)}</Text>
                  <Text style={[styles.premiumChange, ceIsUp ? styles.textGreen : styles.textRed]}>
                    {ceIsUp ? '+' : ''}{ceTick.change_percent.toFixed(1)}%
                  </Text>
                </View>
                <Text style={[styles.viewChartLink, { color: theme.accent }]}>📈 View Graph</Text>
              </TouchableOpacity>

              {/* Strike Column */}
              <View style={[styles.strikeCol, { flex: 0.8 }]}>
                <Text style={[styles.strikeText, { color: theme.textSecondary }, isATM && styles.atmStrikeText, isATM && { color: theme.accent }]}>
                  {strike}
                </Text>
                {isATM && <Text style={[styles.atmBadge, { backgroundColor: theme.accent }]}>ATM</Text>}
              </View>

              {/* PE Premium Column (Clickable to open PE detail screen) */}
              <TouchableOpacity 
                style={[styles.optionCol, { flex: 1.2, alignItems: 'flex-end' }]}
                onPress={() => setActiveStockSymbol(peSymbol)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.premiumChange, peIsUp ? styles.textGreen : styles.textRed]}>
                    {peIsUp ? '+' : ''}{peTick.change_percent.toFixed(1)}%
                  </Text>
                  <Text style={[styles.premiumPrice, { color: theme.text }]}>{getCurrencySymbol(peSymbol)}{peTick.price.toFixed(2)}</Text>
                </View>
                <Text style={[styles.viewChartLink, { color: theme.accent }]}>📈 View Graph</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const liveTick = liveTicks[activeStockSymbol] || {
    price: 0,
    change: 0,
    change_percent: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
    name: 'Stock'
  };

  const isUp = liveTick.change_percent >= 0;
  const isWatchlisted = watchlist.includes(activeStockSymbol);

  // Helper functions for recommendation signals
  const getSignalColor = (sig) => {
    if (sig.includes('BUY')) return '#26a69a';
    if (sig.includes('SELL')) return '#ef5350';
    return '#808a9d';
  };

  const getSignalBgColor = (sig) => {
    if (sig.includes('BUY')) return 'rgba(38, 166, 154, 0.12)';
    if (sig.includes('SELL')) return 'rgba(239, 83, 80, 0.12)';
    return 'rgba(128, 138, 157, 0.12)';
  };

  // Calculate technical predictive recommendation from latest indicator values
  const recommendation = React.useMemo(() => {
    if (!candles.length) return { signal: 'HOLD', confidence: 50, explanation: 'Computing consensus...', details: [] };
    const latestCandle = candles[candles.length - 1];
    
    let buyVotes = 0;
    let sellVotes = 0;
    let neutralVotes = 0;
    let details = [];

    const { close, rsi_14, ema_9, ema_21, macd_line, macd_signal, bb_upper, bb_lower } = latestCandle;

    // 1. RSI
    if (rsi_14 !== null && rsi_14 !== undefined) {
      if (rsi_14 < 30) {
        buyVotes += 2.0;
        details.push({ name: 'RSI (14)', status: `Oversold (${Math.round(rsi_14)})`, color: '#26a69a' });
      } else if (rsi_14 > 70) {
        sellVotes += 2.0;
        details.push({ name: 'RSI (14)', status: `Overbought (${Math.round(rsi_14)})`, color: '#ef5350' });
      } else {
        neutralVotes += 1.0;
        details.push({ name: 'RSI (14)', status: `Neutral (${Math.round(rsi_14)})`, color: '#808a9d' });
      }
    }

    // 2. EMA
    if (ema_9 && ema_21) {
      if (ema_9 > ema_21) {
        buyVotes += 1.5;
        details.push({ name: 'EMA(9/21)', status: 'Golden Cross (Bullish)', color: '#26a69a' });
      } else {
        sellVotes += 1.5;
        details.push({ name: 'EMA(9/21)', status: 'Death Cross (Bearish)', color: '#ef5350' });
      }
    }

    // 3. MACD
    if (macd_line !== null && macd_signal !== null) {
      if (macd_line > macd_signal) {
        buyVotes += 1.0;
        details.push({ name: 'MACD', status: 'Bullish Crossover', color: '#26a69a' });
      } else {
        sellVotes += 1.0;
        details.push({ name: 'MACD', status: 'Bearish Crossover', color: '#ef5350' });
      }
    }

    // 4. Bollinger Bands
    if (bb_upper && bb_lower) {
      if (close <= bb_lower * 1.005) {
        buyVotes += 1.5;
        details.push({ name: 'Bollinger Bands', status: 'Support Boundary (Buy)', color: '#26a69a' });
      } else if (close >= bb_upper * 0.995) {
        sellVotes += 1.5;
        details.push({ name: 'Bollinger Bands', status: 'Resistance Boundary (Sell)', color: '#ef5350' });
      } else {
        neutralVotes += 0.5;
        details.push({ name: 'Bollinger Bands', status: 'Neutral Channel', color: '#808a9d' });
      }
    }

    const totalVotes = buyVotes + sellVotes + neutralVotes;
    const buyRatio = buyVotes / (totalVotes || 1);
    const sellRatio = sellVotes / (totalVotes || 1);

    let signal = 'HOLD';
    let confidence = 50;
    let explanation = '';

    if (buyRatio > 0.55) {
      signal = buyRatio > 0.75 ? 'STRONG BUY' : 'BUY';
      confidence = Math.round(buyRatio * 100);
      explanation = `Bullish indicator consensus. ${
        rsi_14 && rsi_14 < 30 ? 'Extreme oversold RSI signals an elite buy-the-dip opportunity. ' : ''
      }${ema_9 > ema_21 ? 'Short-term Golden Cross crossover reinforces immediate upward trend momentum.' : ''}`;
    } else if (sellRatio > 0.55) {
      signal = sellRatio > 0.75 ? 'STRONG SELL' : 'SELL';
      confidence = Math.round(sellRatio * 100);
      explanation = `Bearish indicator consensus. ${
        rsi_14 && rsi_14 > 70 ? 'Extreme overbought levels signal strong pullback risk. ' : ''
      }${ema_9 < ema_21 ? 'Death Cross crossover indicates a prevailing downward correction pattern.' : ''}`;
    } else {
      signal = 'HOLD';
      confidence = Math.round((1 - Math.abs(buyRatio - sellRatio)) * 100);
      explanation = 'Market indicator signals are conflicting. Consolidation channel in progress. Recommend holding current positions.';
    }

    return { signal, confidence, explanation, details };
  }, [candles]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Scrollable stock card */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Block */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={[styles.circleBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={[styles.tickerText, { color: theme.text }]}>{activeStockSymbol}</Text>
            <Text style={[styles.companyText, { color: theme.textSecondary }]} numberOfLines={1}>{liveTick.name}</Text>
          </View>

          <TouchableOpacity onPress={() => toggleWatchlist(activeStockSymbol)} style={[styles.circleBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {isWatchlisted ? (
              <Star color="#ffb74d" fill="#ffb74d" size={20} />
            ) : (
              <Star color={theme.text} size={20} />
            )}
          </TouchableOpacity>
        </View>

        {/* Real-time Ticker Value */}
        <View style={styles.tickerBanner}>
          <Text style={[styles.priceText, { color: theme.text }]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.price.toFixed(2)}</Text>
          <View style={[styles.changeBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.changeText, isUp ? styles.textGreen : styles.textRed]}>
              {isUp ? '▲' : '▼'} {liveTick.change.toFixed(2)} ({isUp ? '+' : ''}{liveTick.change_percent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* 1. Custom Technical Chart Viewport */}
        {loading ? (
          <View style={[styles.loaderBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.accent} size="large" />
            <Text style={[styles.loaderText, { color: theme.textSecondary }]}>Computing indicators (EMA, RSI, MACD)...</Text>
          </View>
        ) : (
          <InteractiveChart
            candles={candles}
            activeInterval={activeInterval}
            onIntervalChange={setActiveInterval}
          />
        )}

        {/* Tab Switcher */}
        {!isOptionSymbol && (
          <View style={[styles.segmentTabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'TECHNICAL INFO' && styles.segmentTabActive, activeTab === 'TECHNICAL INFO' && { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab('TECHNICAL INFO')}
            >
              <Text style={[styles.segmentTabText, { color: theme.textSecondary }, activeTab === 'TECHNICAL INFO' && styles.segmentTabTextActive]}>
                TECHNICAL INFO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'OPTION CHAIN' && styles.segmentTabActive, activeTab === 'OPTION CHAIN' && { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab('OPTION CHAIN')}
            >
              <Text style={[styles.segmentTabText, { color: theme.textSecondary }, activeTab === 'OPTION CHAIN' && styles.segmentTabTextActive]}>
                OPTION CHAIN
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isOptionSymbol ? (
          <>
            {/* Predictive Signals Dashboard */}
            {!loading && candles.length > 0 && (
              <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.signalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.signalTitle, { color: theme.text }]}>Indicator Prediction Consensus</Text>
                    <Text style={[styles.signalExplanation, { color: theme.textSecondary }]}>{recommendation.explanation}</Text>
                  </View>
                  <View style={[styles.signalBadge, { backgroundColor: getSignalBgColor(recommendation.signal) }]}>
                    <Text style={[styles.signalBadgeText, { color: getSignalColor(recommendation.signal) }]}>
                      {recommendation.signal}
                    </Text>
                    <Text style={[styles.signalConfText, { color: getSignalColor(recommendation.signal) }]}>
                      {recommendation.confidence}% Conf.
                    </Text>
                  </View>
                </View>

                <View style={[styles.signalDivider, { backgroundColor: theme.border }]} />

                <Text style={[styles.subplotTitle, { color: theme.textSecondary }]}>TECHNICAL METRIC DETAILS</Text>
                <View style={styles.ratingGrid}>
                  {recommendation.details.map((det, idx) => (
                    <View key={`det-${idx}`} style={styles.ratingRow}>
                      <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>{det.name}</Text>
                      <Text style={[styles.ratingVal, { color: det.color }]}>{det.status}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Key Option Premium Performance Metrics */}
            <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Premium Stats</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Open Premium</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.open.toFixed(2)}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day's High Premium</Text>
                  <Text style={[styles.statValue, styles.textGreen]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.high.toFixed(2)}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day's Low Premium</Text>
                  <Text style={[styles.statValue, styles.textRed]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.low.toFixed(2)}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Volume (Contracts)</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{liveTick.volume.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </>
        ) : activeTab === 'TECHNICAL INFO' ? (
          <>
            {/* Predictive Signals Dashboard */}
            {!loading && candles.length > 0 && (
              <View style={[styles.signalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.signalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.signalTitle, { color: theme.text }]}>Indicator Prediction Consensus</Text>
                    <Text style={[styles.signalExplanation, { color: theme.textSecondary }]}>{recommendation.explanation}</Text>
                  </View>
                  <View style={[styles.signalBadge, { backgroundColor: getSignalBgColor(recommendation.signal) }]}>
                    <Text style={[styles.signalBadgeText, { color: getSignalColor(recommendation.signal) }]}>
                      {recommendation.signal}
                    </Text>
                    <Text style={[styles.signalConfText, { color: getSignalColor(recommendation.signal) }]}>
                      {recommendation.confidence}% Conf.
                    </Text>
                  </View>
                </View>

                <View style={[styles.signalDivider, { backgroundColor: theme.border }]} />

                <Text style={[styles.subplotTitle, { color: theme.textSecondary }]}>TECHNICAL METRIC DETAILS</Text>
                <View style={styles.ratingGrid}>
                  {recommendation.details.map((det, idx) => (
                    <View key={`det-${idx}`} style={styles.ratingRow}>
                      <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>{det.name}</Text>
                      <Text style={[styles.ratingVal, { color: det.color }]}>{det.status}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 2. Key Stock Performance Metrics */}
            <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Performance Stats</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Open Price</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.open.toFixed(2)}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day's High</Text>
                  <Text style={[styles.statValue, styles.textGreen]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.high.toFixed(2)}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day's Low</Text>
                  <Text style={[styles.statValue, styles.textRed]}>{getCurrencySymbol(activeStockSymbol)}{liveTick.low.toFixed(2)}</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Volume (Shares)</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{liveTick.volume.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* 3. Bid/Ask Orderbook Depth Visualizer */}
            <View style={[styles.depthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Market Depth (Order Book)</Text>
              <View style={[styles.depthHeader, { borderColor: theme.border }]}>
                <Text style={[styles.depthTitle, styles.textGreen]}>Bids (Buy)</Text>
                <Text style={[styles.depthTitle, styles.textRed]}>Asks (Sell)</Text>
              </View>

              <View style={styles.depthColumns}>
                {/* Bids Column */}
                <View style={styles.depthCol}>
                  {marketDepth.bids.map((bid, i) => (
                    <View key={`bid-${i}`} style={styles.depthRow}>
                      <Text style={[styles.depthPrice, styles.textGreen]}>{bid.price.toFixed(2)}</Text>
                      <Text style={[styles.depthQty, { color: theme.textSecondary }]}>{bid.qty}</Text>
                    </View>
                  ))}
                  <View style={[styles.depthTotalRow, { borderColor: theme.border }]}>
                    <Text style={[styles.depthTotalLabel, { color: theme.textSecondary }]}>Total Bids</Text>
                    <Text style={[styles.depthTotalVal, { color: theme.text }]}>{marketDepth.bidTotal || 0}</Text>
                  </View>
                </View>

                {/* Asks Column */}
                <View style={styles.depthCol}>
                  {marketDepth.asks.map((ask, i) => (
                    <View key={`ask-${i}`} style={styles.depthRow}>
                      <Text style={[styles.depthQty, { color: theme.textSecondary }]}>{ask.qty}</Text>
                      <Text style={[styles.depthPrice, styles.textRed]}>{ask.price.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.depthTotalRow, { borderColor: theme.border }]}>
                    <Text style={[styles.depthTotalLabel, { color: theme.textSecondary }]}>Total Asks</Text>
                    <Text style={[styles.depthTotalVal, { color: theme.text }]}>{marketDepth.askTotal || 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          renderOptionChain()
        )}
      </ScrollView>

      {/* 4. Bottom Fast Trade Action Buttons */}
      <View style={[styles.fixedDock, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <TouchableOpacity style={[styles.dockBtn, styles.dockBtnBuy]} onPress={() => setTradeModal({ type: 'BUY', symbol: activeStockSymbol, price: liveTick.price })}>
          <Text style={styles.dockBtnText}>BUY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dockBtn, styles.dockBtnSell]} onPress={() => setTradeModal({ type: 'SELL', symbol: activeStockSymbol, price: liveTick.price })}>
          <Text style={styles.dockBtnText}>SELL</Text>
        </TouchableOpacity>
      </View>

      {/* Trade Sheet Modal */}
      {tradeModal && (
        <OrderModal
          visible={!!tradeModal}
          onClose={() => setTradeModal(null)}
          symbol={tradeModal.symbol}
          initialPrice={tradeModal.price}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1017',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 90, // safe space for fixed trade dock
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  circleBtn: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 8,
    borderRadius: 20,
  },
  titleArea: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  tickerText: {
    color: '#c9d1d9',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  companyText: {
    color: '#808a9d',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  tickerBanner: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
    justifyContent: 'center',
    gap: 10,
  },
  priceText: {
    color: '#c9d1d9',
    fontSize: 26,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  changeBadge: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  loaderBox: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    marginVertical: 10,
  },
  loaderText: {
    color: '#808a9d',
    fontSize: 11,
    marginTop: 10,
  },
  statsCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  sectionTitle: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 10,
  },
  statLabel: {
    color: '#808a9d',
    fontSize: 10,
  },
  statValue: {
    color: '#c9d1d9',
    fontSize: 13.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 4,
  },
  depthCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  depthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingBottom: 6,
    marginBottom: 10,
  },
  depthTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  depthColumns: {
    flexDirection: 'row',
    gap: 20,
  },
  depthCol: {
    flex: 1,
  },
  depthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  depthPrice: {
    fontSize: 11.5,
    fontFamily: 'monospace',
  },
  depthQty: {
    color: '#808a9d',
    fontSize: 11.5,
    fontFamily: 'monospace',
  },
  depthTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#21262d',
    paddingTop: 6,
    marginTop: 6,
  },
  depthTotalLabel: {
    color: '#808a9d',
    fontSize: 11,
  },
  depthTotalVal: {
    color: '#c9d1d9',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  fixedDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0c1017',
    borderTopWidth: 1,
    borderColor: '#30363d',
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  dockBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnBuy: {
    backgroundColor: '#2196f3',
  },
  dockBtnSell: {
    backgroundColor: '#ff5252',
  },
  dockBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  textGreen: {
    color: '#26a69a',
  },
  textRed: {
    color: '#ef5350',
  },
  signalCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  signalTitle: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 'bold',
  },
  signalExplanation: {
    color: '#808a9d',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  signalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  signalBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  signalConfText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    marginTop: 2,
  },
  signalDivider: {
    height: 1,
    backgroundColor: '#21262d',
    marginVertical: 12,
  },
  subplotTitle: {
    color: '#808a9d',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ratingGrid: {
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLabel: {
    color: '#808a9d',
    fontSize: 11.5,
  },
  ratingVal: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  segmentTabBar: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderRadius: 8,
    padding: 4,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#ff5722',
  },
  segmentTabText: {
    color: '#808a9d',
    fontWeight: 'bold',
    fontSize: 11.5,
    letterSpacing: 0.5,
  },
  segmentTabTextActive: {
    color: '#ffffff',
  },
  optionChainCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
  },
  optionChainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingBottom: 10,
  },
  optionChainTitle: {
    color: '#c9d1d9',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  optionChainSubtitle: {
    color: '#ff5722',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#21262d',
    marginBottom: 10,
  },
  tableHeaderCol: {
    justifyContent: 'center',
  },
  tableHeaderLabel: {
    color: '#808a9d',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  strikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#21262d',
  },
  atmRowHighlight: {
    backgroundColor: 'rgba(255, 87, 34, 0.04)',
    borderColor: 'rgba(255, 87, 34, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
  },
  optionCol: {
    justifyContent: 'center',
  },
  premiumPrice: {
    color: '#c9d1d9',
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  premiumChange: {
    fontSize: 9.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  optActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  optActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  optActionText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  strikeCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  strikeText: {
    color: '#808a9d',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  atmStrikeText: {
    color: '#ff5722',
  },
  atmBadge: {
    color: '#ffffff',
    backgroundColor: '#ff5722',
    fontSize: 7.5,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginTop: 2,
  },
  viewChartLink: {
    color: '#ff5722',
    fontSize: 9.5,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
