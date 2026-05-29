import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Briefcase, ArrowUpRight, TrendingUp, TrendingDown, PieChart as PieIcon } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import OrderModal from '../components/OrderModal';
import { getCurrencySymbol } from '../utils/api';

// Sector mapping lookup
const SECTOR_COLORS = {
  'IT / Software': '#2196f3',
  'Energy / Oil': '#4caf50',
  'Banking & Finance': '#ff9800',
  'Steel & Metal': '#9c27b0',
  'FMCG / Goods': '#e91e63',
  'Virtual Cash': '#607d8b'
};

const getSector = (symbol) => {
  const parts = symbol.split('_');
  const cleanSymbol = parts[0];
  if (cleanSymbol === 'NIFTY50' || cleanSymbol === 'SENSEX' || cleanSymbol === 'BANKNIFTY' || cleanSymbol === 'NIFTYIT') return 'Banking & Finance'; // Benchmark indices
  if (['TCS', 'INFY', 'LTIM'].includes(cleanSymbol)) return 'IT / Software';
  if (['RELIANCE'].includes(cleanSymbol)) return 'Energy / Oil';
  if (['HDFCBANK', 'ICICIBANK', 'SBIN'].includes(cleanSymbol)) return 'Banking & Finance';
  if (['TATASTEEL'].includes(cleanSymbol)) return 'Steel & Metal';
  if (['ITC'].includes(cleanSymbol)) return 'FMCG / Goods';
  return 'IT / Software';
};

// Custom SVG Donut Chart Component
function SectorAllocationDonut({ holdings = [], cash = 1000000 }) {
  const { theme } = useApp();
  const data = React.useMemo(() => {
    const sectors = {};
    let grandTotal = cash;

    holdings.forEach((h) => {
      const sec = getSector(h.symbol);
      const val = h.currentPrice * h.quantity;
      sectors[sec] = (sectors[sec] || 0) + val;
      grandTotal += val;
    });

    sectors['Virtual Cash'] = cash;

    return Object.keys(sectors).map((sec) => {
      const val = sectors[sec];
      const percent = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
      return { sector: sec, value: val, percent, color: SECTOR_COLORS[sec] || '#795548' };
    });
  }, [holdings, cash]);

  // Construct SVG polar coordinate arc segments
  let cumulativeAngle = 0;
  const radius = 50;
  const center = 60;
  const strokeWidth = 14;
  const circ = 2 * Math.PI * radius;

  const arcs = data.map((item, idx) => {
    if (item.percent === 0) return null;
    const angle = (item.percent / 100) * 360;
    const strokeDash = (item.percent / 100) * circ;
    const strokeOffset = circ - (cumulativeAngle / 360) * circ;
    cumulativeAngle += angle;

    return (
      <Circle
        key={`arc-${idx}`}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={item.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${strokeDash} ${circ - strokeDash}`}
        strokeDashoffset={strokeOffset}
        transform={`rotate(-90 ${center} ${center})`}
      />
    );
  });

  return (
    <View style={[styles.donutCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.donutHeader, { color: theme.text }]}>Asset & Sector Allocation</Text>
      <View style={styles.donutRow}>
        <View style={styles.svgWrapper}>
          <Svg width="120" height="120" style={{ overflow: 'visible' }}>
            <Circle cx={center} cy={center} r={radius} fill="none" stroke={theme.border} strokeWidth={strokeWidth} />
            {arcs}
            <Circle cx={center} cy={center} r={radius - strokeWidth / 2} fill={theme.card} />
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {data.map((item, idx) => (
            <View key={`leg-${idx}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.sector} ({Math.round(item.percent)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function PortfolioScreen({ onNavigateToDetail }) {
  const { userProfile, portfolioSummary, theme } = useApp();
  const [activeTab, setActiveTab] = useState('holdings'); // 'holdings' | 'positions'
  const [activeTrade, setActiveTrade] = useState(null); // for liquidating / adding positions

  const summary = portfolioSummary;
  const isUp = summary.totalUnrealizedPnL >= 0;

  const renderHoldingItem = ({ item }) => {
    const isItemUp = item.pnl >= 0;
    const parts = item.symbol.split('_');
    const isOption = parts.length === 3 && (parts[2] === 'CE' || parts[2] === 'PE');
    
    return (
      <View style={[styles.portfolioRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.portfolioMain} onPress={() => onNavigateToDetail && onNavigateToDetail(item.symbol)}>
          <View style={styles.secLeft}>
            <Text style={[styles.symText, { color: theme.text }]}>{item.symbol}</Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              {isOption ? `${item.quantity} Lots • Avg ${getCurrencySymbol(item.symbol)}${item.average_price.toFixed(2)}` : `${item.quantity} Qty • Avg ${getCurrencySymbol(item.symbol)}${item.average_price.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.secRight}>
            <Text style={[styles.priceText, { color: theme.text }]}>{getCurrencySymbol(item.symbol)}{item.currentPrice.toFixed(2)}</Text>
            <View style={styles.pnlRow}>
              {isItemUp ? <TrendingUp size={10} color="#26a69a" /> : <TrendingDown size={10} color="#ef5350" />}
              <Text style={[styles.pnlText, isItemUp ? styles.textGreen : styles.textRed]}>
                {isItemUp ? '+' : ''}{item.pnl.toFixed(2)} ({isItemUp ? '+' : ''}{item.pnl_percent.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Panel for holdings */}
        <View style={[styles.itemActions, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.miniActionBtn, styles.btnBuy]}
            onPress={() => setActiveTrade({ symbol: item.symbol, price: item.currentPrice, type: 'BUY' })}
          >
            <Text style={[styles.miniBtnText, { color: theme.text }]}>ADD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniActionBtn, styles.btnSell]}
            onPress={() => setActiveTrade({ symbol: item.symbol, price: item.currentPrice, type: 'SELL' })}
          >
            <Text style={[styles.miniBtnText, { color: theme.text }]}>EXIT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPositionItem = ({ item }) => {
    const isLong = item.quantity > 0;
    const isClosed = item.is_closed || item.quantity === 0;
    const isPnlUp = item.total_pnl >= 0;
    const parts = item.symbol.split('_');
    const isOption = parts.length === 3 && (parts[2] === 'CE' || parts[2] === 'PE');

    return (
      <View style={[styles.portfolioRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.portfolioMain} onPress={() => onNavigateToDetail && onNavigateToDetail(item.symbol)}>
          <View style={styles.secLeft}>
            <View style={styles.badgeRow}>
              <Text style={[styles.symText, { color: theme.text }]}>{item.symbol}</Text>
              <View style={[styles.productBadge, isClosed ? styles.badgeClosed : (isLong ? styles.badgeLong : styles.badgeShort)]}>
                <Text style={[styles.badgeText, { color: theme.text }]}>
                  {isClosed ? 'CLOSED' : (isOption ? (isLong ? 'LONG (CE/PE)' : 'SHORT (CE/PE)') : (isLong ? 'LONG (MIS)' : 'SHORT (MIS)'))}
                </Text>
              </View>
            </View>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              {!isClosed ? (isOption ? `${Math.abs(item.quantity)} Lots • Avg ${getCurrencySymbol(item.symbol)}${item.average_price.toFixed(2)}` : `${Math.abs(item.quantity)} Qty • Avg ${getCurrencySymbol(item.symbol)}${item.average_price.toFixed(2)}`) : 'Square-off complete'}
            </Text>
          </View>
          <View style={styles.secRight}>
            <Text style={[styles.priceText, { color: theme.text }]}>{!isClosed ? `${getCurrencySymbol(item.symbol)}${item.currentPrice.toFixed(2)}` : 'Closed'}</Text>
            <View style={styles.pnlRow}>
              {isPnlUp ? <TrendingUp size={10} color="#26a69a" /> : <TrendingDown size={10} color="#ef5350" />}
              <Text style={[styles.pnlText, isPnlUp ? styles.textGreen : styles.textRed]}>
                {isPnlUp ? '+' : ''}{item.total_pnl.toFixed(2)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Square-off position quickly */}
        {!isClosed && (
          <View style={[styles.itemActions, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.miniActionBtn, { flex: 1, backgroundColor: 'rgba(239, 83, 80, 0.12)', borderColor: 'rgba(239, 83, 80, 0.3)' }]}
              onPress={() => setActiveTrade({
                symbol: item.symbol,
                price: item.currentPrice,
                type: isLong ? 'SELL' : 'BUY',
                isSquareOff: true
              })}
            >
              <Text style={[styles.miniBtnText, styles.textRed]}>SQUARE OFF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Dynamic overall portfolio card */}
        <View style={[styles.dashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.dbRow}>
            <View>
              <Text style={[styles.dbLabel, { color: theme.textSecondary }]}>Invested Capital</Text>
              <Text style={[styles.dbValueLarge, { color: theme.text }]}>₹{summary.totalInvested.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.dbLabel, { color: theme.textSecondary }]}>Unrealized P&L</Text>
              <View style={[styles.pnlBadge, { backgroundColor: isUp ? 'rgba(38, 166, 154, 0.12)' : 'rgba(239, 83, 80, 0.12)' }]}>
                <Text style={[styles.pnlBadgeText, isUp ? styles.textGreen : styles.textRed]}>
                  {isUp ? '+' : ''}{summary.totalUnrealizedPnL.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

          <View style={styles.dbRow}>
            <View>
              <Text style={[styles.dbLabelSub, { color: theme.textSecondary }]}>Current Portolio Value</Text>
              <Text style={[styles.dbValueSub, { color: theme.text }]}>₹{summary.totalCurrentValue.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.dbLabelSub, { color: theme.textSecondary }]}>Available Margin</Text>
              <Text style={[styles.dbValueSub, { color: theme.text }]}>₹{userProfile?.cash_balance ? userProfile.cash_balance.toLocaleString() : '0.00'}</Text>
            </View>
          </View>
        </View>

        {/* Allocation Donut Chart */}
        {summary.enrichedHoldings.length > 0 && (
          <SectorAllocationDonut holdings={summary.enrichedHoldings} cash={userProfile?.cash_balance || 0} />
        )}

        {/* Tab switch bar: Holdings vs Positions */}
        <View style={[styles.tabBar, { borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'holdings' && styles.tabActive, activeTab === 'holdings' && { borderColor: theme.accent }]}
            onPress={() => setActiveTab('holdings')}
          >
            <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'holdings' && styles.tabTextActive, activeTab === 'holdings' && { color: theme.accent }]}>
              Holdings ({summary.enrichedHoldings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'positions' && styles.tabActive, activeTab === 'positions' && { borderColor: theme.accent }]}
            onPress={() => setActiveTab('positions')}
          >
            <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'positions' && styles.tabTextActive, activeTab === 'positions' && { color: theme.accent }]}>
              Positions ({summary.enrichedPositions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Grid display */}
        {activeTab === 'holdings' ? (
          summary.enrichedHoldings.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Briefcase size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Holdings Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>You haven't bought any stock for delivery. Navigate to the watchlist, explore a ticker, and purchase under CNC mode!</Text>
            </View>
          ) : (
            <FlatList
              data={summary.enrichedHoldings}
              keyExtractor={(item) => `holding-${item.id}`}
              renderItem={renderHoldingItem}
              scrollEnabled={false}
            />
          )
        ) : (
          summary.enrichedPositions.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ArrowUpRight size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Positions Active</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>No leverage intraday MIS trades placed today. Try placing a short or leveraged long trade!</Text>
            </View>
          ) : (
            <FlatList
              data={summary.enrichedPositions}
              keyExtractor={(item) => `position-${item.id}`}
              renderItem={renderPositionItem}
              scrollEnabled={false}
            />
          )
        )}
      </ScrollView>

      {/* order execution modal */}
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
  container: {
    flex: 1,
    backgroundColor: '#0c1017',
  },
  scrollContainer: {
    padding: 15,
  },
  dashboardCard: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 18,
    marginBottom: 15,
  },
  dbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dbLabel: {
    color: '#808a9d',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dbValueLarge: {
    color: '#c9d1d9',
    fontSize: 22,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 4,
  },
  pnlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pnlBadgeText: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#30363d',
    marginVertical: 14,
  },
  dbLabelSub: {
    color: '#808a9d',
    fontSize: 10.5,
  },
  dbValueSub: {
    color: '#c9d1d9',
    fontSize: 14.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 2,
  },
  donutCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  donutHeader: {
    color: '#c9d1d9',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 15,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1.2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: '#808a9d',
    fontSize: 10.5,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#21262d',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderColor: '#ff5722',
  },
  tabText: {
    color: '#808a9d',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#ff5722',
  },
  portfolioRow: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  portfolioMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  secLeft: {
    flex: 1.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symText: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLong: {
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  badgeShort: {
    backgroundColor: 'rgba(233, 30, 99, 0.12)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(128, 138, 157, 0.12)',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#c9d1d9',
  },
  subText: {
    color: '#808a9d',
    fontSize: 11,
    marginTop: 4,
  },
  secRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  priceText: {
    color: '#c9d1d9',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pnlText: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginLeft: 2,
  },
  itemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#21262d',
    padding: 8,
    gap: 8,
    backgroundColor: '#0c1017',
  },
  miniActionBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnBuy: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.25)',
  },
  btnSell: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  miniBtnText: {
    color: '#c9d1d9',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    marginVertical: 10,
  },
  emptyTitle: {
    color: '#c9d1d9',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#808a9d',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  textGreen: {
    color: '#26a69a',
  },
  textRed: {
    color: '#ef5350',
  },
});
