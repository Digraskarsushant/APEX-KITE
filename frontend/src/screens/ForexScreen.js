import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { TrendingUp, TrendingDown, Globe, Search } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { apiService, getCurrencySymbol } from '../utils/api';
import InteractiveChart from '../components/InteractiveChart';
import ForexOrderModal from '../components/ForexOrderModal';

export default function ForexScreen() {
  const { liveTicks, theme } = useApp();
  const [forexPairs, setForexPairs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePair, setActivePair] = useState(null);
  const [candles, setCandles] = useState([]);
  const [activeInterval, setActiveInterval] = useState('1m');
  const [loading, setLoading] = useState(true);
  const [activeTrade, setActiveTrade] = useState(null); // { symbol, price, type }

  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  useEffect(() => {
    const fetchStocksList = async () => {
      try {
        const stocks = await apiService.searchStocks();
        const fx = stocks.filter(s => s.name.includes('/'));
        setForexPairs(fx);
        if (fx.length > 0 && !activePair) {
          setActivePair(fx[0].symbol);
        }
      } catch (e) {
        console.error('Failed to load forex list:', e);
      }
    };
    fetchStocksList();
  }, []);

  useEffect(() => {
    if (!activePair) return;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await apiService.getStockHistory(activePair, activeInterval);
        setCandles(data);
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [activePair, activeInterval]);

  const liveTick = liveTicks[activePair] || { price: 0, change_percent: 0, change: 0 };
  const isUp = liveTick.change_percent >= 0;

  const filteredPairs = forexPairs.filter(p => p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Search color={theme.textSecondary} size={18} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search Forex (e.g., JPY, EUR)"
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Top Strip: Asset Selector */}
      <View style={[styles.topStrip, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Globe size={18} color={theme.accent} style={{ marginRight: 15, marginLeft: 10 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assetScroller}>
          {filteredPairs.map((pair) => {
            const pairTick = liveTicks[pair.symbol] || { price: 0, change_percent: 0 };
            const isActive = pair.symbol === activePair;
            return (
              <TouchableOpacity 
                key={pair.symbol} 
                style={[styles.assetTab, isActive && styles.assetTabActive, isActive && { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
                onPress={() => setActivePair(pair.symbol)}
              >
                <Text style={[styles.assetTabName, { color: isActive ? theme.accent : theme.textSecondary }]}>{pair.symbol}</Text>
                <Text style={[styles.assetTabPrice, pairTick.change_percent >= 0 ? styles.textGreen : styles.textRed]}>
                  {pairTick.change_percent >= 0 ? '▲' : '▼'} {Math.abs(pairTick.change_percent).toFixed(2)}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.mainLayout, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        {/* Main Chart Area */}
        <View style={styles.chartArea}>
          {loading || !activePair ? (
            <View style={[styles.loaderContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={{color: theme.textSecondary, marginTop: 15}}>Initializing Live Chart...</Text>
            </View>
          ) : (
            <InteractiveChart
              candles={candles}
              activeInterval={activeInterval}
              onIntervalChange={setActiveInterval}
            />
          )}
        </View>

        {/* Binomo Style Trading Panel */}
        {activePair && (
          <View style={[styles.tradingPanel, { backgroundColor: theme.card, borderColor: theme.border }, isDesktop && styles.tradingPanelDesktop]}>
            <Text style={[styles.panelTitle, { color: theme.textSecondary }]}>Live Investment</Text>
            
            <View style={[styles.priceDisplay, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.currentPrice, { color: theme.text }]}>
                {getCurrencySymbol(activePair)}{liveTick.price.toFixed(4)}
              </Text>
              <View style={[styles.priceChangeBadge, { backgroundColor: isUp ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)' }]}>
                <Text style={[styles.priceChangeText, isUp ? styles.textGreen : styles.textRed]}>
                  {isUp ? '+' : ''}{liveTick.change.toFixed(4)} ({liveTick.change_percent.toFixed(2)}%)
                </Text>
              </View>
            </View>

            <View style={[styles.actionButtonsRow, isDesktop && styles.actionButtonsCol]}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnUp]}
                onPress={() => setActiveTrade({ symbol: activePair, price: liveTick.price, type: 'BUY' })}
              >
                <TrendingUp size={isDesktop ? 48 : 36} color="#ffffff" style={{ marginBottom: 6 }} />
                <Text style={styles.btnActionText}>UP</Text>
                <Text style={styles.btnActionSub}>CALL / BUY</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnDown]}
                onPress={() => setActiveTrade({ symbol: activePair, price: liveTick.price, type: 'SELL' })}
              >
                <TrendingDown size={isDesktop ? 48 : 36} color="#ffffff" style={{ marginBottom: 6 }} />
                <Text style={styles.btnActionText}>DOWN</Text>
                <Text style={styles.btnActionSub}>PUT / SELL</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Custom Forex Execution Modal */}
      {activeTrade && (
        <ForexOrderModal
          visible={!!activeTrade}
          onClose={() => setActiveTrade(null)}
          symbol={activeTrade.symbol}
          initialPrice={activeTrade.price}
          actionType={activeTrade.type}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#30363d',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#c9d1d9',
    fontSize: 14,
  },
  topStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  assetScroller: {
    gap: 10,
    paddingRight: 20,
  },
  assetTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#0c1017',
    gap: 8,
  },
  assetTabActive: {
    borderColor: '#ff5722',
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
  },
  assetTabName: {
    color: '#808a9d',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assetTabPrice: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainLayout: {
    flex: 1,
  },
  chartArea: {
    flex: 1,
    padding: 10,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradingPanel: {
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderColor: '#30363d',
    padding: 20,
    gap: 15,
  },
  tradingPanelDesktop: {
    width: 320,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    padding: 25,
    justifyContent: 'center',
  },
  panelTitle: {
    color: '#808a9d',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 5,
  },
  priceDisplay: {
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  currentPrice: {
    color: '#c9d1d9',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  priceChangeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceChangeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButtonsCol: {
    flexDirection: 'column',
    gap: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5, // shadow on android
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)', // shadow on web
  },
  btnUp: {
    backgroundColor: '#26a69a',
  },
  btnDown: {
    backgroundColor: '#ef5350',
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnActionSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  textGreen: {
    color: '#26a69a',
  },
  textRed: {
    color: '#ef5350',
  },
});
