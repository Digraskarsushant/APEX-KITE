import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Star, Briefcase, ClipboardList, User as UserIcon, TrendingUp, TrendingDown, RefreshCw, Settings as SettingsIcon } from 'lucide-react-native';

import { AppProvider, useApp } from './src/context/AppContext';
import AuthScreen from './src/screens/AuthScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import StockDetailScreen from './src/screens/StockDetailScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Core Navigation App Wrapper
function MainAppContent() {
  const { isLoggedIn, userProfile, portfolioSummary, loading, error, initializeApp, setActiveStockSymbol, theme } = useApp();
  const [activeScreen, setActiveScreen] = useState('watchlist'); // 'watchlist' | 'portfolio' | 'orders' | 'profile' | 'settings' | 'detail'
  const [detailSymbol, setDetailSymbol] = useState(null);

  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  // Intercept and ask for Login/Register if not authenticated
  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ff5722" size="large" />
        <Text style={styles.loadingText}>Connecting to Apex Kite Terminal...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Failed</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => initializeApp()}>
          <RefreshCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const navigateToDetail = (symbol) => {
    setActiveStockSymbol(symbol);
    setDetailSymbol(symbol);
    setActiveScreen('detail');
  };

  const navigateBack = () => {
    setActiveScreen('watchlist');
  };

  // Render active screen
  const renderScreen = () => {
    switch (activeScreen) {
      case 'watchlist':
        return <WatchlistScreen onNavigateToDetail={navigateToDetail} />;
      case 'detail':
        return <StockDetailScreen symbol={detailSymbol} onBack={navigateBack} />;
      case 'portfolio':
        return <PortfolioScreen onNavigateToDetail={navigateToDetail} />;
      case 'orders':
        return <OrdersScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <WatchlistScreen onNavigateToDetail={navigateToDetail} />;
    }
  };

  const netPnL = portfolioSummary.netPnL;
  const isPnLUp = netPnL >= 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      {/* 1. Header (Responsive desktop navbar & branding) */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: theme.text }]}>APEX</Text>
          <Text style={styles.brandLiteText}>KITE</Text>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>PRO</Text>
          </View>
        </View>

        {/* Live Net P&L & Margin tickers in header */}
        <View style={styles.headerTickers}>
          <View style={styles.headerTickerItem}>
            <Text style={[styles.tickerLabel, { color: theme.textSecondary }]}>Margin Available</Text>
            <Text style={[styles.tickerVal, { color: theme.text }]}>
              ₹{userProfile?.cash_balance ? userProfile.cash_balance.toLocaleString([], { maximumFractionDigits: 0 }) : '0'}
            </Text>
          </View>
          <View style={styles.headerTickerItem}>
            <Text style={[styles.tickerLabel, { color: theme.textSecondary }]}>Day's P&L</Text>
            <Text style={[styles.tickerVal, isPnLUp ? styles.textGreen : styles.textRed]}>
              {isPnLUp ? '+' : ''}{netPnL.toLocaleString([], { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        {/* Desktop Navbar Tabs */}
        {isDesktop && (
          <View style={styles.desktopTabs}>
            <TouchableOpacity
              style={[styles.desktopTab, activeScreen === 'watchlist' && styles.desktopTabActive, activeScreen === 'watchlist' && { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setActiveScreen('watchlist')}
            >
              <Star size={14} color={activeScreen === 'watchlist' ? '#ff5722' : theme.textSecondary} />
              <Text style={[styles.desktopTabText, { color: theme.textSecondary }, activeScreen === 'watchlist' && styles.desktopTabTextActive]}>Watchlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.desktopTab, activeScreen === 'portfolio' && styles.desktopTabActive, activeScreen === 'portfolio' && { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setActiveScreen('portfolio')}
            >
              <Briefcase size={14} color={activeScreen === 'portfolio' ? '#ff5722' : theme.textSecondary} />
              <Text style={[styles.desktopTabText, { color: theme.textSecondary }, activeScreen === 'portfolio' && styles.desktopTabTextActive]}>Portfolio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.desktopTab, activeScreen === 'orders' && styles.desktopTabActive, activeScreen === 'orders' && { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setActiveScreen('orders')}
            >
              <ClipboardList size={14} color={activeScreen === 'orders' ? '#ff5722' : theme.textSecondary} />
              <Text style={[styles.desktopTabText, { color: theme.textSecondary }, activeScreen === 'orders' && styles.desktopTabTextActive]}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.desktopTab, activeScreen === 'profile' && styles.desktopTabActive, activeScreen === 'profile' && { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setActiveScreen('profile')}
            >
              <UserIcon size={14} color={activeScreen === 'profile' ? '#ff5722' : theme.textSecondary} />
              <Text style={[styles.desktopTabText, { color: theme.textSecondary }, activeScreen === 'profile' && styles.desktopTabTextActive]}>Funds</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.desktopTab, activeScreen === 'settings' && styles.desktopTabActive, activeScreen === 'settings' && { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setActiveScreen('settings')}
            >
              <SettingsIcon size={14} color={activeScreen === 'settings' ? '#ff5722' : theme.textSecondary} />
              <Text style={[styles.desktopTabText, { color: theme.textSecondary }, activeScreen === 'settings' && styles.desktopTabTextActive]}>Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. Main Active Workspace Screen Area */}
      <View style={[styles.mainContent, { backgroundColor: theme.background }]}>
        {renderScreen()}
      </View>

      {/* 3. Mobile Bottom Navigation Bar */}
      {!isDesktop && (
        <View style={[styles.mobileTabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.mobileTab, activeScreen === 'watchlist' && styles.mobileTabActive]}
            onPress={() => setActiveScreen('watchlist')}
          >
            <Star size={18} color={activeScreen === 'watchlist' ? '#ff5722' : theme.textSecondary} />
            <Text style={[styles.mobileTabText, { color: theme.textSecondary }, activeScreen === 'watchlist' && styles.mobileTabTextActive]}>Watchlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeScreen === 'portfolio' && styles.mobileTabActive]}
            onPress={() => setActiveScreen('portfolio')}
          >
            <Briefcase size={18} color={activeScreen === 'portfolio' ? '#ff5722' : theme.textSecondary} />
            <Text style={[styles.mobileTabText, { color: theme.textSecondary }, activeScreen === 'portfolio' && styles.mobileTabTextActive]}>Portfolio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeScreen === 'orders' && styles.mobileTabActive]}
            onPress={() => setActiveScreen('orders')}
          >
            <ClipboardList size={18} color={activeScreen === 'orders' ? '#ff5722' : theme.textSecondary} />
            <Text style={[styles.mobileTabText, { color: theme.textSecondary }, activeScreen === 'orders' && styles.mobileTabTextActive]}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeScreen === 'profile' && styles.mobileTabActive]}
            onPress={() => setActiveScreen('profile')}
          >
            <UserIcon size={18} color={activeScreen === 'profile' ? '#ff5722' : theme.textSecondary} />
            <Text style={[styles.mobileTabText, { color: theme.textSecondary }, activeScreen === 'profile' && styles.mobileTabTextActive]}>Funds</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeScreen === 'settings' && styles.mobileTabActive]}
            onPress={() => setActiveScreen('settings')}
          >
            <SettingsIcon size={18} color={activeScreen === 'settings' ? '#ff5722' : theme.textSecondary} />
            <Text style={[styles.mobileTabText, { color: theme.textSecondary }, activeScreen === 'settings' && styles.mobileTabTextActive]}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1017',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c1017',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#808a9d',
    fontSize: 13,
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0c1017',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    color: '#ef5350',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    color: '#808a9d',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5722',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderColor: '#30363d',
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandLiteText: {
    color: '#ff5722',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  demoBadge: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderWidth: 1,
    borderColor: '#ff5722',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  demoBadgeText: {
    color: '#ff5722',
    fontSize: 7.5,
    fontWeight: 'bold',
  },
  headerTickers: {
    flexDirection: 'row',
    gap: 15,
  },
  headerTickerItem: {
    alignItems: 'flex-end',
  },
  tickerLabel: {
    color: '#808a9d',
    fontSize: 8.5,
    textTransform: 'uppercase',
  },
  tickerVal: {
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 2,
  },
  desktopTabs: {
    flexDirection: 'row',
    gap: 20,
  },
  desktopTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  desktopTabActive: {
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  desktopTabText: {
    color: '#808a9d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  desktopTabTextActive: {
    color: '#ff5722',
  },
  mainContent: {
    flex: 1,
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderColor: '#30363d',
    paddingVertical: 8,
  },
  mobileTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mobileTabActive: {
    opacity: 1,
  },
  mobileTabText: {
    color: '#808a9d',
    fontSize: 9,
    fontWeight: '600',
  },
  mobileTabTextActive: {
    color: '#ff5722',
    fontWeight: 'bold',
  },
  textGreen: {
    color: '#26a69a',
  },
  textRed: {
    color: '#ef5350',
  },
});
