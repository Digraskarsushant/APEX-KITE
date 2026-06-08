import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { X, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { getCurrencySymbol } from '../utils/api';

export default function ForexOrderModal({ visible, onClose, symbol, initialPrice, actionType }) {
  const { userProfile, submitOrder, theme, getExchangeRateToINR } = useApp();

  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' }); 

  const isUp = actionType === 'BUY';
  const actionColor = isUp ? '#26a69a' : '#ef5350';
  const actionText = isUp ? 'UP (BUY)' : 'DOWN (SELL)';

  const qty = parseInt(quantity) || 0;
  
  // Quick margin math (5x leverage for MIS)
  const leverage = 5;
  const marginRequiredOriginal = Math.round(((qty * initialPrice) / leverage) * 100) / 100;
  const exchangeRate = getExchangeRateToINR(symbol);
  const marginRequired = Math.round(marginRequiredOriginal * exchangeRate * 100) / 100;
  const hasSufficientFunds = (userProfile?.cash_balance || 0) >= marginRequired;

  const handleSubmit = async () => {
    if (qty <= 0) {
      setStatusMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (!hasSufficientFunds) {
      setStatusMessage({ type: 'error', text: 'Insufficient virtual cash balance.' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: '', text: '' });

    const orderPayload = {
      symbol,
      order_type: 'MARKET',
      transaction_type: actionType, // 'BUY' or 'SELL'
      product_type: 'MIS',
      quantity: qty,
      price: initialPrice,
      trigger_price: null,
    };

    const res = await submitOrder(orderPayload);
    setLoading(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Prediction placed! Trade Active.` });
      setTimeout(() => {
        setStatusMessage({ type: '', text: '' });
        onClose();
      }, 1500);
    } else {
      setStatusMessage({ type: 'error', text: res.error });
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: '#161b22', borderColor: actionColor }]}>
          
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color="#808a9d" size={24} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: actionColor }]}>{actionText} PREDICTION</Text>
            <Text style={styles.subtitle}>{symbol} @ {getCurrencySymbol(symbol)}{initialPrice.toFixed(4)}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Investment Quantity</Text>
            <TextInput
              style={[styles.textInput, { borderColor: actionColor, color: actionColor }]}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Quantity"
              placeholderTextColor="#30363d"
            />
          </View>

          <View style={styles.marginBox}>
            <View style={styles.marginRow}>
              <Text style={styles.marginLabel}>Margin Required:</Text>
              <Text style={styles.marginVal}>₹{marginRequired.toLocaleString()}</Text>
            </View>
            <View style={styles.marginRow}>
              <Text style={styles.marginLabel}>Available Cash:</Text>
              <Text style={[styles.marginVal, !hasSufficientFunds && { color: '#ef5350' }]}>
                ₹{userProfile?.cash_balance ? userProfile.cash_balance.toLocaleString() : '0.00'}
              </Text>
            </View>
          </View>

          {statusMessage.text !== '' && (
            <View style={[styles.alertBox, statusMessage.type === 'success' ? styles.alertSuccess : styles.alertError]}>
              <Text style={[styles.alertText, statusMessage.type === 'success' ? styles.textSuccess : styles.textError]}>
                {statusMessage.text}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: actionColor },
              (!hasSufficientFunds) && styles.actionBtnDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading || !hasSufficientFunds}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="large" />
            ) : (
              <View style={styles.btnContent}>
                {isUp ? <TrendingUp color="#ffffff" size={28} /> : <TrendingDown color="#ffffff" size={28} />}
                <Text style={styles.actionBtnText}>CONFIRM {isUp ? 'UP' : 'DOWN'}</Text>
              </View>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 2,
    padding: 30,
    position: 'relative',
    elevation: 10,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#c9d1d9',
    fontSize: 16,
    fontFamily: 'monospace',
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    color: '#808a9d',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#0c1017',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  marginBox: {
    backgroundColor: '#0c1017',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
  },
  marginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  marginLabel: {
    color: '#808a9d',
    fontSize: 14,
  },
  marginVal: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  alertBox: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  alertSuccess: {
    backgroundColor: 'rgba(38, 166, 154, 0.1)',
    borderColor: '#26a69a',
  },
  alertError: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderColor: '#ef5350',
  },
  alertText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#26a69a',
  },
  textError: {
    color: '#ef5350',
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
