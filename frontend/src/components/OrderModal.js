import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { X, TrendingUp, ShieldAlert } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import StripePaymentModal from './StripePaymentModal';
import { getCurrencySymbol } from '../utils/api';

export default function OrderModal({ visible, onClose, symbol, initialPrice, initialAction = 'BUY' }) {
  const { userProfile, settings, submitOrder, theme, getExchangeRateToINR } = useApp();

  const [transactionType, setTransactionType] = useState(initialAction); // 'BUY' | 'SELL'
  const [stripeVisible, setStripeVisible] = useState(false);
  const [productType, setProductType] = useState('CNC'); // 'CNC' (Delivery) | 'MIS' (Intraday)
  const [orderType, setOrderType] = useState('MARKET'); // 'MARKET' | 'LIMIT' | 'SL'
  
  const [quantity, setQuantity] = useState('10');
  const [price, setPrice] = useState(initialPrice ? initialPrice.toFixed(2) : '100.00');
  const [triggerPrice, setTriggerPrice] = useState(initialPrice ? (initialPrice * 0.95).toFixed(2) : '95.00');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' }); // type: 'success' | 'error'

  // Dynamic price syncing when initialPrice or orderType changes
  useEffect(() => {
    if (initialPrice) {
      if (orderType === 'MARKET') {
        setPrice(initialPrice.toFixed(2));
      }
    }
  }, [initialPrice, orderType]);

  const parts = symbol.split('_');
  const isOption = parts.length === 3 && (parts[2] === 'CE' || parts[2] === 'PE');
  let lotSize = 1;
  if (isOption) {
    const underlying = parts[0];
    const lotSizes = {
      "NIFTY50": 50, "SENSEX": 10, "BANKNIFTY": 15, "NIFTYIT": 50,
      "SP500": 10, "NASDAQ": 10, "DOW": 10, "FTSE100": 10, "NIKKEI": 100,
      "AAPL": 100, "MSFT": 100, "NVDA": 100, "GOOGL": 100, "AMZN": 100, "TSLA": 100, "META": 100
    };
    lotSize = lotSizes[underlying] || 1;
  }

  const qty = parseInt(quantity) || 0;
  const priceVal = parseFloat(price) || 0;
  const triggerVal = parseFloat(triggerPrice) || 0;

  // Margin math (5x leverage for intraday MIS, 1x for CNC delivery)
  const leverage = productType === 'MIS' ? 5 : 1;
  const marginRequiredOriginal = Math.round(((qty * (orderType === 'MARKET' && initialPrice ? initialPrice : priceVal) * lotSize) / leverage) * 100) / 100;
  const exchangeRate = getExchangeRateToINR(symbol);
  const marginRequired = Math.round(marginRequiredOriginal * exchangeRate * 100) / 100;
  const hasSufficientFunds = (userProfile?.cash_balance || 0) >= marginRequired;

  const handleSubmit = async () => {
    if (qty <= 0) {
      setStatusMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (orderType !== 'MARKET' && priceVal <= 0) {
      setStatusMessage({ type: 'error', text: 'Price must be greater than 0.' });
      return;
    }
    if (orderType === 'SL' && triggerVal <= 0) {
      setStatusMessage({ type: 'error', text: 'Trigger price must be greater than 0.' });
      return;
    }
    if (transactionType === 'BUY' && !hasSufficientFunds) {
      setStatusMessage({ type: 'error', text: 'Insufficient virtual cash balance.' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: '', text: '' });

    const orderPayload = {
      symbol,
      order_type: orderType,
      transaction_type: transactionType,
      product_type: productType,
      quantity: qty,
      price: orderType === 'MARKET' && initialPrice ? initialPrice : priceVal,
      trigger_price: orderType === 'SL' ? triggerVal : null,
    };

    const res = await submitOrder(orderPayload);
    setLoading(false);

    if (res.success) {
      const successText = res.message || `Order placed successfully!`;
      setStatusMessage({ type: 'success', text: successText });
      setTimeout(() => {
        setStatusMessage({ type: '', text: '' });
        onClose();
      }, res.message ? 3500 : 1500);
    } else {
      setStatusMessage({ type: 'error', text: res.error });
    }
  };

  const isBuy = transactionType === 'BUY';
  const accentColor = isBuy ? '#2196f3' : '#ff5252';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.headerTitle, { color: accentColor }]}>
                  {transactionType} {symbol}
                </Text>
                {settings.tradingMode === 'broker' && (
                  <View style={[
                    styles.brokerBadge, 
                    { 
                      backgroundColor: settings.realMoneyEnabled ? 'rgba(239, 83, 80, 0.12)' : 'rgba(255, 167, 38, 0.12)',
                      borderColor: settings.realMoneyEnabled ? '#ef5350' : '#ffa726' 
                    }
                  ]}>
                    <Text style={[styles.brokerBadgeText, { color: settings.realMoneyEnabled ? '#ef5350' : '#ffa726' }]}>
                      {settings.realMoneyEnabled ? 'REAL MONEY' : 'SANDBOX BRIDGE'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {isOption ? `1 Lot = ${lotSize} Shares @ ${getCurrencySymbol(symbol)}${initialPrice ? initialPrice.toFixed(2) : '0.00'}` : `x1 Qty @ ${getCurrencySymbol(symbol)}${initialPrice ? initialPrice.toFixed(2) : '0.00'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <X color={theme.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          {/* Buy / Sell Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.tab, isBuy && styles.tabBuyActive]}
              onPress={() => {
                setTransactionType('BUY');
                setStatusMessage({ type: '', text: '' });
              }}
            >
              <Text style={[styles.tabText, { color: theme.textSecondary }, isBuy && styles.tabTextActive, isBuy && { color: accentColor }]}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isBuy && styles.tabSellActive]}
              onPress={() => {
                setTransactionType('SELL');
                setStatusMessage({ type: '', text: '' });
              }}
            >
              <Text style={[styles.tabText, { color: theme.textSecondary }, !isBuy && styles.tabTextActive, !isBuy && { color: accentColor }]}>SELL</Text>
            </TouchableOpacity>
          </View>

          {/* CNC / MIS Selector */}
          <View style={styles.selectorGroup}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Product</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, { backgroundColor: theme.background, borderColor: theme.border }, productType === 'CNC' && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => setProductType('CNC')}
              >
                <Text style={[styles.selectorBtnText, { color: theme.textSecondary }, productType === 'CNC' && styles.textWhite]}>CNC (Delivery)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, { backgroundColor: theme.background, borderColor: theme.border }, productType === 'MIS' && { backgroundColor: accentColor, borderColor: accentColor }]}
                onPress={() => setProductType('MIS')}
              >
                <Text style={[styles.selectorBtnText, { color: theme.textSecondary }, productType === 'MIS' && styles.textWhite]}>MIS (Intraday 5x)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Type: MARKET / LIMIT / SL */}
          <View style={styles.selectorGroup}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Order Type</Text>
            <View style={styles.btnRow}>
              {['MARKET', 'LIMIT', 'SL'].map((type) => (
                <TouchableOpacity
                   key={type}
                  style={[
                    styles.selectorBtn,
                    { flex: 1, backgroundColor: theme.background, borderColor: theme.border },
                    orderType === type && { backgroundColor: accentColor, borderColor: accentColor },
                  ]}
                  onPress={() => setOrderType(type)}
                >
                  <Text style={[styles.selectorBtnText, { color: theme.textSecondary }, orderType === type && styles.textWhite]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form Fields: Qty, Price, Trigger Price */}
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{isOption ? 'Lots' : 'Qty'}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder={isOption ? "Lots" : "Quantity"}
                placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
              />
              {isOption && (
                <Text style={{ color: theme.textSecondary, fontSize: 9.5, marginTop: 4 }}>
                  = {qty * lotSize} Shares
                </Text>
              )}
            </View>

            <View style={styles.formCol}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Price ({getCurrencySymbol(symbol)})</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }, orderType === 'MARKET' && styles.inputDisabled, orderType === 'MARKET' && { backgroundColor: theme.card, color: theme.textSecondary }]}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                editable={orderType !== 'MARKET'}
                placeholder="Limit Price"
                placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
              />
            </View>

            {orderType === 'SL' && (
              <View style={styles.formCol}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Trigger ({getCurrencySymbol(symbol)})</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  keyboardType="numeric"
                  value={triggerPrice}
                  onChangeText={setTriggerPrice}
                  placeholder="Trigger Price"
                  placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                />
              </View>
            )}
          </View>

          {/* Real-time Status Alert */}
          {statusMessage.text !== '' && (
            <View style={[styles.alertBox, statusMessage.type === 'success' ? styles.alertSuccess : styles.alertError]}>
              <Text style={[styles.alertText, statusMessage.type === 'success' ? styles.textSuccess : styles.textError]}>
                {statusMessage.text}
              </Text>
            </View>
          )}

          {/* Financial summary: Margin required vs buying power */}
          <View style={[styles.summaryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Margin Required</Text>
              <Text style={[styles.summaryVal, { color: theme.text }]}>₹{marginRequired.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Available Cash</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.summaryVal, { color: theme.text }, !hasSufficientFunds && isBuy && styles.textRed]}>
                  ₹{userProfile?.cash_balance ? userProfile.cash_balance.toLocaleString() : '0.00'}
                </Text>
                {!hasSufficientFunds && isBuy && settings.tradingMode === 'broker' && (
                  <TouchableOpacity onPress={() => setStripeVisible(true)} style={styles.quickFundBtn}>
                    <Text style={styles.quickFundBtnText}>⚡ Fund via Stripe</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {exchangeRate !== 1.0 && (
              <Text style={{ color: theme.accent, fontSize: 9.5, marginTop: 6, fontWeight: 'bold' }}>
                ℹ️ Converted from {getCurrencySymbol(symbol)}{marginRequiredOriginal.toLocaleString()} (Exchange Rate: 1 {getCurrencySymbol(symbol)} = ₹{exchangeRate})
              </Text>
            )}
            {productType === 'MIS' && (
              <Text style={styles.leverageTip}>ℹ️ Enjoying 5x Intraday Leverage. Position auto-squares off at 3:15 PM.</Text>
            )}
          </View>

          {settings.tradingMode === 'broker' && (
            <View style={[
              styles.brokerWarningCard, 
              { backgroundColor: theme.background, borderColor: settings.realMoneyEnabled ? '#ef5350' : '#ffa726' }
            ]}>
              <Text style={[styles.brokerWarningTitle, { color: settings.realMoneyEnabled ? '#ef5350' : '#ffa726' }]}>
                {settings.realMoneyEnabled ? '⚠️ ACTIVE REAL MONEY ROUTING' : 'ℹ️ SANDBOX BROKER BRIDGE ACTIVE'}
              </Text>
              <Text style={[styles.brokerWarningText, { color: theme.textSecondary }]}>
                {settings.realMoneyEnabled
                  ? `Placed via real-time ${settings.broker} bridge. Account: ${settings.clientId || 'DemoAccount'}. Financial capital is active.`
                  : `Simulated via ${settings.broker} broker API. Sandboxed Account ID: ${settings.clientId || 'DemoAccount'}.`
                }
              </Text>
            </View>
          )}

          {/* Action Trigger Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: accentColor },
              (!hasSufficientFunds && isBuy) && styles.actionBtnDisabled,
              (!hasSufficientFunds && isBuy) && { backgroundColor: theme.border },
            ]}
            onPress={handleSubmit}
            disabled={loading || (!hasSufficientFunds && isBuy)}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionBtnText}>
                {transactionType === 'BUY' ? 'PLACE BUY ORDER' : 'PLACE SELL ORDER'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {stripeVisible && (
        <StripePaymentModal
          visible={stripeVisible}
          onClose={() => setStripeVisible(false)}
          initialAmount={Math.ceil(marginRequired - (userProfile?.cash_balance || 0))}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c1017',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitleRow: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#808a9d',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 5,
    backgroundColor: '#161b22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBuyActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  tabSellActive: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  tabText: {
    color: '#808a9d',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#ff5722',
  },
  selectorGroup: {
    marginBottom: 15,
  },
  sectionLabel: {
    color: '#808a9d',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  selectorBtnText: {
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: '600',
  },
  textWhite: {
    color: '#ffffff',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  formCol: {
    flex: 1,
  },
  inputLabel: {
    color: '#808a9d',
    fontSize: 11,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputDisabled: {
    backgroundColor: '#0c1017',
    color: '#484f58',
    borderColor: '#21262d',
  },
  alertBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    borderWidth: 1,
  },
  alertSuccess: {
    backgroundColor: 'rgba(38, 166, 154, 0.1)',
    borderColor: 'rgba(38, 166, 154, 0.3)',
  },
  alertError: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderColor: 'rgba(239, 83, 80, 0.3)',
  },
  alertText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    color: '#808a9d',
    fontSize: 12,
  },
  summaryVal: {
    color: '#c9d1d9',
    fontSize: 12.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  leverageTip: {
    color: '#e040fb',
    fontSize: 9.5,
    marginTop: 8,
    lineHeight: 12,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: '#21262d',
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  textGreen: {
    color: '#26a69a',
  },
  textRed: {
    color: '#ef5350',
  },
  textSuccess: {
    color: '#26a69a',
  },
  textError: {
    color: '#ef5350',
  },
  // NEW broker styles
  brokerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  brokerBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brokerWarningCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  brokerWarningTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brokerWarningText: {
    color: '#808a9d',
    fontSize: 10.5,
    marginTop: 4,
    lineHeight: 14,
  },
  quickFundBtn: {
    backgroundColor: 'rgba(99, 91, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  quickFundBtnText: {
    color: '#635bff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
