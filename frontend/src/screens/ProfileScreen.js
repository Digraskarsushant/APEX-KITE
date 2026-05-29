import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { User, Wallet, RotateCcw, ShieldCheck, Mail, HardDrive, DollarSign, ShieldAlert } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import StripePaymentModal from '../components/StripePaymentModal';

export default function ProfileScreen() {
  const { userProfile, settings, addVirtualCash, resetDemoProfile, loading, theme } = useApp();
  const [fundsAmount, setFundsAmount] = useState('100000');
  const [addingFunds, setAddingFunds] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [stripeVisible, setStripeVisible] = useState(false);

  const handleAddFunds = async () => {
    const val = parseFloat(fundsAmount) || 0;
    if (val <= 0) return;
    setAddingFunds(true);
    await addVirtualCash(val);
    setAddingFunds(false);
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset your demo account? This deletes all holdings, order history, active positions, watchlists, and resets virtual funds to ₹10,00,000.")) {
      return;
    }
    setResetting(true);
    await resetDemoProfile();
    setResetting(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.avatarCircle}>
            <User size={36} color="#ffffff" />
          </View>
          <Text style={[styles.usernameText, { color: theme.text }]}>
            {userProfile?.username ? `@${userProfile.username}` : '@trader_demo'}
          </Text>
          <View style={styles.profileBadge}>
            <ShieldCheck size={11} color="#26a69a" />
            <Text style={styles.profileBadgeText}>PRO DEMO ACCOUNT</Text>
          </View>

          <View style={styles.metaRow}>
            <Mail size={12} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {userProfile?.email || 'trader@apex.demo'}
            </Text>
          </View>
        </View>

        {/* Available Margins */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Wallet size={16} color="#ff5722" />
            <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>Marginal Cash & Equity</Text>
          </View>
          <Text style={styles.balanceVal}>
            ₹{userProfile?.cash_balance ? userProfile.cash_balance.toLocaleString() : '0.00'}
          </Text>
          <Text style={[styles.balanceSub, { color: theme.textSecondary }]}>This cash is active for placing CNC holdings and leveraged intraday MIS orders.</Text>
        </View>

        {/* Stripe Live Capital Funding */}
        {settings.tradingMode === 'broker' && (
          <View style={[styles.sectionCard, styles.stripeCardBorder, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <ShieldAlert size={16} color="#635bff" />
              <Text style={[styles.cardHeaderTitle, { color: '#635bff' }]}>Stripe Capital Funding</Text>
              <View style={styles.liveIndicator}>
                <Text style={styles.liveIndicatorText}>LIVE</Text>
              </View>
            </View>
            
            <Text style={[styles.stripeDescription, { color: theme.textSecondary }]}>
              Configure your broker capital using card or Indian UPI accounts. Transaction settles securely via sandboxed Stripe SSL gateway.
            </Text>

            <TouchableOpacity style={styles.stripeLaunchBtn} onPress={() => setStripeVisible(true)}>
              <Text style={styles.stripeLaunchBtnText}>DEPOSIT FUNDS VIA STRIPE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Virtual Capital funding */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <DollarSign size={16} color="#2196f3" />
            <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>Add Virtual Cash</Text>
          </View>
          
          <View style={styles.fundForm}>
            <TextInput
              style={[styles.fundsInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              keyboardType="numeric"
              value={fundsAmount}
              onChangeText={setFundsAmount}
              placeholder="Amount in ₹"
              placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
            />
            <TouchableOpacity style={styles.fundSubmitBtn} onPress={handleAddFunds} disabled={addingFunds}>
              {addingFunds ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.fundSubmitText}>ADD FUNDS</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.quickFundsRow}>
            {['50000', '100000', '500000'].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.quickAmtBtn, { backgroundColor: theme.buttonBg, borderColor: theme.border }]}
                onPress={() => setFundsAmount(amt)}
              >
                <Text style={[styles.quickAmtText, { color: theme.textSecondary }]}>+₹{parseInt(amt).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Maintenance Box */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <HardDrive size={16} color="#ef5350" />
            <Text style={[styles.cardHeaderTitle, { color: theme.text }]}>Account Maintenance</Text>
          </View>

          <Text style={[styles.maintenanceText, { color: theme.textSecondary }]}>
            Resetting your demo account deletes all long-term holdings, active day-trading positions, custom watchlists, order history logs, and restores your cash to ₹10 Lakhs.
          </Text>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnReset]}
            onPress={handleReset}
            disabled={resetting || loading}
          >
            {resetting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <RotateCcw size={14} color="#ffffff" />
                <Text style={styles.actionBtnText}>RESET DEMO PORTFOLIO</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <StripePaymentModal
        visible={stripeVisible}
        onClose={() => setStripeVisible(false)}
        initialAmount={parseInt(fundsAmount) || 50000}
      />
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
  },
  profileCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ff5722',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0c1017',
    marginBottom: 12,
  },
  usernameText: {
    color: '#c9d1d9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(38, 166, 154, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.2)',
  },
  profileBadgeText: {
    color: '#26a69a',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  metaText: {
    color: '#808a9d',
    fontSize: 11.5,
  },
  sectionCard: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  balanceVal: {
    color: '#26a69a',
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  balanceSub: {
    color: '#808a9d',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  fundForm: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  fundsInput: {
    flex: 1,
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  fundSubmitBtn: {
    backgroundColor: '#2196f3',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  fundSubmitText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickFundsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  quickAmtBtn: {
    flex: 1,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 4,
  },
  quickAmtText: {
    color: '#808a9d',
    fontSize: 10,
    fontWeight: 'bold',
  },
  maintenanceText: {
    color: '#808a9d',
    fontSize: 11.5,
    lineHeight: 18,
    marginBottom: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 10,
  },
  btnReset: {
    backgroundColor: '#ef5350',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  // Stripe integration styles
  stripeCardBorder: {
    borderColor: '#635bff',
    borderWidth: 1.5,
  },
  liveIndicator: {
    backgroundColor: 'rgba(99, 91, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 91, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  liveIndicatorText: {
    color: '#635bff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  stripeDescription: {
    color: '#808a9d',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 15,
  },
  stripeLaunchBtn: {
    backgroundColor: '#635bff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripeLaunchBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
