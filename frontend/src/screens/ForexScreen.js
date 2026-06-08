import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Search, TrendingUp, TrendingDown, X, Globe } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { apiService, getCurrencySymbol } from '../utils/api';
import OrderModal from '../components/OrderModal';
import Svg, { Path } from 'react-native-svg';

// Simplified mini SVG Sparkline Component
function MiniSparkline({ changePercent }) {
  const isUp = changePercent >= 0;
  const strokeColor = isUp ? '#26a69a' : '#ef5350';
  
  const points = isUp 
    ? "M0,15 L10,12 L20,18 L30,5 L40,10 L50,2"
    : "M0,2 L10,12 L20,8 L30,15 L40,12 L50,18";

  return (
    <View style={styles.sparklineContainer}>
      <Svg width={50} height={20} style={{ overflow: 'visible' }}>
        <Path d={points} fill="none" stroke={strokeColor} strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

export default function ForexScreen({ onNavigateToDetail }) {
  const { liveTicks, setActiveStockSymbol, theme } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [forexPairs, setForexPairs] = useState([]);
  const [activeTrade, setActiveTrade] = useState(null);
  const [priceFlash, setPriceFlash] = useState({});

  useEffect(() => {
    const fetchStocksList = async () => {
      try {
        const stocks = await apiService.searchStocks();
        // Filter ONLY Forex pairs (those with '/' in their name like 'EUR/USD')
        const fx = stocks.filter(s => s.name.includes('/'));
        setForexPairs(fx);
      } catch (e) {
        console.error('Failed to load forex list:', e);
      }
    };
    fetchStocksList();
  }, []);

  const prevPrices = React.useRef({});
  useEffect(() => {
    const newFlashes = {};
    let hasChanges = false;
    
    Object.keys(liveTicks).forEach((symbol) => {
      // Fast check to only flash for forex pairs (which have 6 letters and no dots usually, or we just flash all that are in forexPairs)
      // Since we want to be safe, we just process ticks if they exist in forexPairs
      if (!forexPairs.some(f => f.symbol === symbol)) return;
      
      const currentPrice = liveTicks[symbol]?.price;
      const prevPrice = prevPrices.current[symbol];
      
      if (prevPrice !== undefined && currentPrice !== prevPrice) {
        newFlashes[symbol] = currentPrice > prevPrice ? 'up' : 'down';
        hasChanges = true;
      }
      prevPrices.current[symbol] = currentPrice;
    });

    if (hasChanges) {
      setPriceFlash((prev) => ({ ...prev, ...newFlashes }));
      const timer = setTimeout(() => {
        setPriceFlash((prev) => {
          const cleared = { ...prev };
          Object.keys(newFlashes).forEach((sym) => {
            delete cleared[sym];
          });
          return cleared;
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [liveTicks]);

  const filteredForex = forexPairs.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (symbol) => {
    setActiveStockSymbol(symbol);
    if (onNavigateToDetail) {
      onNavigateToDetail(symbol);
    }
  };

  const renderStockItem = ({ item }) => {
    const liveTick = liveTicks[item.symbol] || item;
    const flashState = priceFlash[item.symbol];
    const isUp = liveTick.change_percent >= 0;

    let priceBgColor = 'transparent';
    if (flashState === 'up') priceBgColor = 'rgba(38, 166, 154, 0.2)';
    if (flashState === 'down') priceBgColor = 'rgba(239, 83, 80, 0.2)';

    return (
      <View style={[styles.rowWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.mainRow} onPress={() => handleRowClick(item.symbol)}>
          <View style={styles.symbolSection}>
            <Text style={[styles.symbolText, { color: theme.text }]}>{item.symbol}</Text>
            <Text style={[styles.companyText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <MiniSparkline changePercent={liveTick.change_percent} />

          <View style={styles.priceSection}>
            <View style={[styles.priceFlashBadge, { backgroundColor: priceBgColor }]}>
              <Text style={[styles.priceText, { color: theme.text }, flashState === 'up' && styles.textGreen, flashState === 'down' && styles.textRed]}>
                {getCurrencySymbol(item.symbol)}{liveTick.price.toFixed(4)}
              </Text>
            </View>
            <View style={styles.changeRow}>
              {isUp ? <TrendingUp size={10} color="#26a69a" /> : <TrendingDown size={10} color="#ef5350" />}
              <Text style={[styles.changeText, isUp ? styles.textGreen : styles.textRed]}>
                {isUp ? '+' : ''}{liveTick.change_percent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={[styles.actionsDrawer, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnBuy]}
            onPress={() => setActiveTrade({ symbol: item.symbol, price: liveTick.price, type: 'BUY' })}
          >
            <Text style={styles.actionBtnText}>BUY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnSell]}
            onPress={() => setActiveTrade({ symbol: item.symbol, price: liveTick.price, type: 'SELL' })}
          >
            <Text style={styles.actionBtnText}>SELL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Search color={theme.textSecondary} size={18} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search Forex Pairs e.g. EURUSD, GBPUSD..."
          placeholderTextColor={theme.isDark ? '#484f58' : '#9ca3af'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
            <X color={theme.textSecondary} size={16} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listContainer}>
        <View style={styles.headerRow}>
          <Globe size={14} color="#ff5722" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>Global FX Markets</Text>
        </View>
        <FlatList
          data={filteredForex}
          keyExtractor={(item) => `forex-${item.symbol}`}
          renderItem={renderStockItem}
        />
      </View>

      {activeTrade && (
        <OrderModal
          visible={!!activeTrade}
          onClose={() => setActiveTrade(null)}
          symbol={activeTrade.symbol}
          initialPrice={activeTrade.price}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c1017' },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d', borderRadius: 8, margin: 15, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#c9d1d9', fontSize: 14, paddingVertical: 10, outlineStyle: 'none' },
  clearIcon: { padding: 4, marginLeft: 4 },
  listContainer: { flex: 1, paddingHorizontal: 15 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionHeader: { color: '#808a9d', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowWrapper: { backgroundColor: '#161b22', borderRadius: 8, borderWidth: 1, borderColor: '#21262d', marginBottom: 8, overflow: 'hidden' },
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  symbolSection: { flex: 2 },
  symbolText: { color: '#c9d1d9', fontSize: 14, fontWeight: 'bold' },
  companyText: { color: '#808a9d', fontSize: 11, marginTop: 2, maxWidth: 120 },
  sparklineContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  priceSection: { flex: 1.5, alignItems: 'flex-end' },
  priceFlashBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, transition: 'background-color 0.2s ease-in-out' },
  priceText: { color: '#c9d1d9', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  changeText: { fontSize: 10.5, fontWeight: '600', marginLeft: 2 },
  textGreen: { color: '#26a69a' },
  textRed: { color: '#ef5350' },
  actionsDrawer: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#21262d', padding: 8, gap: 8, backgroundColor: '#0c1017' },
  actionBtn: { flex: 1, paddingVertical: 5, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnBuy: { backgroundColor: 'rgba(33, 150, 243, 0.15)', borderColor: 'rgba(33, 150, 243, 0.3)' },
  btnSell: { backgroundColor: 'rgba(255, 82, 82, 0.15)', borderColor: 'rgba(255, 82, 82, 0.3)' },
  actionBtnText: { color: '#c9d1d9', fontSize: 10, fontWeight: 'bold' }
});
