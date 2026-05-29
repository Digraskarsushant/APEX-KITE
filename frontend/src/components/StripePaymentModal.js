import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { X, CreditCard, ShieldCheck, CheckCircle2, ChevronRight, Smartphone } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

export default function StripePaymentModal({ visible, onClose, initialAmount, onPaymentSuccess }) {
  const { addVirtualCash, theme } = useApp();

  const [activeTab, setActiveTab] = useState('CARD'); // 'CARD' | 'UPI'
  const [amount, setAmount] = useState(initialAmount ? initialAmount.toString() : '50000');
  
  // Card form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // UPI form states
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState(null);

  // Processing & Success states
  const [processingState, setProcessingState] = useState('IDLE'); // 'IDLE' | 'CONNECTING' | 'AUTHORIZING' | 'SUCCESS'
  const [processingText, setProcessingText] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted.substring(0, 19));
  };

  // Format Expiration Date (MM/YY)
  const handleExpiryChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    setExpiry(formatted.substring(0, 5));
  };

  // Format CVC (max 3 digits)
  const handleCvcChange = (text) => {
    setCvc(text.replace(/\D/g, '').substring(0, 3));
  };

  const handlePay = () => {
    const payAmt = parseFloat(amount) || 0;
    if (payAmt <= 0) {
      setErrorMessage('Amount must be greater than 0.');
      return;
    }

    if (activeTab === 'CARD') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setErrorMessage('Please enter a valid 16-digit card number.');
        return;
      }
      if (expiry.length < 5) {
        setErrorMessage('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (cvc.length < 3) {
        setErrorMessage('Please enter a valid 3-digit CVC.');
        return;
      }
    } else {
      // UPI ID validation (checks for '@')
      if (!upiId.includes('@') && !selectedUpiApp) {
        setErrorMessage('Please enter a valid UPI ID (e.g., user@okaxis) or select a payment app.');
        return;
      }
    }

    setErrorMessage('');
    startStripePipeline(payAmt);
  };

  // Simulated Stripe Multi-stage Payment Authorization Pipeline
  const startStripePipeline = (payAmt) => {
    setProcessingState('CONNECTING');
    setProcessingText('Connecting to Stripe secure gateway...');
    
    // Stage 1: Stripe Handshake
    setTimeout(() => {
      setProcessingState('AUTHORIZING');
      setProcessingText(
        activeTab === 'CARD'
          ? 'Authorizing transaction with Card issuer...'
          : 'Waiting for UPI App push notification authorization...'
      );

      // Stage 2: Broker Settlement Handshake
      setTimeout(() => {
        // Complete payment successfully!
        addVirtualCash(payAmt);
        
        // Generate mock transaction reference
        const mockTxId = 'ch_stripe_' + Math.random().toString(36).substring(2, 15).toUpperCase();
        setTransactionId(mockTxId);
        
        setProcessingState('SUCCESS');
        
        // Trigger success callback if passed (e.g. to re-trigger order placements!)
        if (onPaymentSuccess) {
          onPaymentSuccess(payAmt);
        }
      }, 1800);
    }, 1200);
  };

  const isCard = activeTab === 'CARD';
  const payValue = parseFloat(amount) || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {processingState === 'IDLE' ? (
            <>
              {/* Padlocked Stripe Header */}
              <View style={[styles.header, { borderColor: theme.border }]}>
                <View style={styles.stripeTitleContainer}>
                  <ShieldCheck size={20} color="#635bff" />
                  <Text style={[styles.headerTitle, { color: theme.text }]}>Stripe Secure Checkout</Text>
                  <View style={styles.testBadge}>
                    <Text style={styles.testBadgeText}>TEST MODE</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <X color={theme.textSecondary} size={18} />
                </TouchableOpacity>
              </View>

              {/* Funding Amount Form */}
              <View style={styles.amountContainer}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Funding Amount</Text>
                <View style={[styles.amountInputRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.text }]}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                  />
                </View>
              </View>

              {/* Stripe Payment Method Tabs */}
              <View style={[styles.tabBar, { backgroundColor: theme.background }]}>
                <TouchableOpacity
                  style={[styles.tab, isCard && styles.tabActive]}
                  onPress={() => {
                    setActiveTab('CARD');
                    setErrorMessage('');
                  }}
                >
                  <CreditCard size={14} color={isCard ? '#635bff' : '#808a9d'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabText, { color: theme.textSecondary }, isCard && styles.tabTextActive]}>Card Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, !isCard && styles.tabActive]}
                  onPress={() => {
                    setActiveTab('UPI');
                    setErrorMessage('');
                  }}
                >
                  <Smartphone size={14} color={!isCard ? '#635bff' : '#808a9d'} style={{ marginRight: 6 }} />
                  <Text style={[styles.tabText, { color: theme.textSecondary }, !isCard && styles.tabTextActive]}>UPI / GPay</Text>
                </TouchableOpacity>
              </View>

              {/* Card Inputs */}
              {isCard ? (
                <View style={styles.formContainer}>
                  <View style={styles.inputRow}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Card Number</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      keyboardType="numeric"
                      value={cardNumber}
                      onChangeText={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                    />
                  </View>

                  <View style={styles.formSplitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Expiry Date</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        keyboardType="numeric"
                        value={expiry}
                        onChangeText={handleExpiryChange}
                        placeholder="MM/YY"
                        placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CVC</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        keyboardType="numeric"
                        value={cvc}
                        onChangeText={handleCvcChange}
                        placeholder="123"
                        placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                        secureTextEntry={true}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Cardholder Name</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                    />
                  </View>
                </View>
              ) : (
                /* UPI Inputs */
                <View style={styles.formContainer}>
                  {/* Popular UPI Apps Shortcuts */}
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quick Pay via Apps</Text>
                  <View style={styles.upiAppsGrid}>
                    {['Google Pay', 'PhonePe', 'Paytm'].map((app) => (
                      <TouchableOpacity
                        key={app}
                        style={[styles.upiAppBtn, { backgroundColor: theme.background, borderColor: theme.border }, selectedUpiApp === app && styles.upiAppBtnActive]}
                        onPress={() => {
                          setSelectedUpiApp(app);
                          setUpiId(app.toLowerCase().replace(/\s/g, '') + '@securepay');
                          setErrorMessage('');
                        }}
                      >
                        <Text style={[styles.upiAppBtnText, { color: theme.text }, selectedUpiApp === app && styles.textStripe]}>
                          {app}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.inputRow}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Or Enter Custom UPI VPA ID</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                      value={upiId}
                      onChangeText={(text) => {
                        setUpiId(text);
                        setSelectedUpiApp(null);
                      }}
                      placeholder="username@bankid"
                      placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* Error Box */}
              {errorMessage !== '' && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Stripe Payment Trigger button */}
              <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
                <Text style={styles.payBtnText}>
                  PAY ₹{payValue.toLocaleString()} VIA STRIPE
                </Text>
              </TouchableOpacity>
              
              <Text style={[styles.stripeInfoFooter, { color: theme.textSecondary }]}>
                🔒 Payments processed securely via sandboxed Stripe SSL bridge.
              </Text>
            </>
          ) : processingState === 'CONNECTING' || processingState === 'AUTHORIZING' ? (
            /* STRIPE PROCESSING INTERFACE */
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#635bff" />
              <Text style={[styles.processingStateTitle, { color: theme.text }]}>Stripe Securing Gateway...</Text>
              <Text style={[styles.processingStateSub, { color: theme.textSecondary }]}>{processingText}</Text>
              <View style={styles.securedCard}>
                <Text style={styles.securedCardText}>🔒 Stripe Inc. 256-Bit SSL Encrypted</Text>
              </View>
            </View>
          ) : (
            /* PAYMENT SUCCESS RECEIPT SCREEN */
            <View style={styles.successContainer}>
              <CheckCircle2 size={56} color="#26a69a" style={{ marginBottom: 15 }} />
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={[styles.successSub, { color: theme.textSecondary }]}>
                Your transaction has been settled successfully via Stripe Checkout.
              </Text>

              {/* Bill Details */}
              <View style={[styles.receiptBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Transaction ID</Text>
                  <Text style={[styles.receiptVal, { color: theme.text }]}>{transactionId}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Credited Amount</Text>
                  <Text style={[styles.receiptVal, styles.textGreen]}>₹{payValue.toLocaleString()}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Funding Source</Text>
                  <Text style={[styles.receiptVal, { color: theme.text }]}>
                    {isCard ? 'Visa Card ending in 4242' : `UPI: ${upiId}`}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Gateway Provider</Text>
                  <Text style={[styles.receiptVal, { color: theme.text }]}>Stripe Testnet SSL</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.successBtn} onPress={onClose}>
                <Text style={styles.successBtnText}>COMPLETE & RETURN</Text>
                <ChevronRight size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c1017',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    minHeight: 450,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#21262d',
    paddingBottom: 10,
  },
  stripeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testBadge: {
    backgroundColor: 'rgba(99, 91, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  testBadgeText: {
    color: '#635bff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 15,
  },
  amountContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#808a9d',
    fontSize: 10.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    color: '#635bff',
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    color: '#c9d1d9',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    paddingVertical: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(99, 91, 255, 0.12)',
  },
  tabText: {
    color: '#808a9d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#635bff',
  },
  formContainer: {
    gap: 15,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'column',
    gap: 6,
  },
  inputLabel: {
    color: '#808a9d',
    fontSize: 11,
  },
  textInput: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13.5,
    fontFamily: 'monospace',
  },
  formSplitRow: {
    flexDirection: 'row',
    gap: 15,
  },
  upiAppsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  upiAppBtn: {
    flex: 1,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  upiAppBtnActive: {
    borderColor: '#635bff',
    backgroundColor: 'rgba(99, 91, 255, 0.08)',
  },
  upiAppBtnText: {
    color: '#c9d1d9',
    fontSize: 11,
    fontWeight: 'bold',
  },
  textStripe: {
    color: '#635bff',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 11.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  payBtn: {
    backgroundColor: '#635bff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  payBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  stripeInfoFooter: {
    color: '#808a9d',
    fontSize: 9.5,
    textAlign: 'center',
  },
  
  // Processing screens
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 350,
  },
  processingStateTitle: {
    color: '#c9d1d9',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 15,
  },
  processingStateSub: {
    color: '#808a9d',
    fontSize: 11.5,
    marginTop: 6,
    textAlign: 'center',
  },
  securedCard: {
    backgroundColor: 'rgba(99, 91, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 25,
  },
  securedCardText: {
    color: '#635bff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 350,
  },
  successTitle: {
    color: '#26a69a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successSub: {
    color: '#808a9d',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginVertical: 20,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    color: '#808a9d',
    fontSize: 11.5,
  },
  receiptVal: {
    color: '#c9d1d9',
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  textGreen: {
    color: '#26a69a',
  },
  successBtn: {
    flexDirection: 'row',
    backgroundColor: '#26a69a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  successBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
