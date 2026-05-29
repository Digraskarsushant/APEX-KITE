import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Modal } from 'react-native';
import { User, Shield, LogOut, Sliders, Volume2, Monitor, AlertTriangle, Cpu, HelpCircle } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

export default function SettingsScreen() {
  const { userProfile, settings, updateSettings, logoutAction, theme } = useApp();

  // Local state for interactive warning modals
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showRealMoneyModal, setShowRealMoneyModal] = useState(false);

  const handleTradingModeChange = (mode) => {
    if (mode === 'broker') {
      setShowBrokerModal(true);
    } else {
      updateSettings('tradingMode', 'paper');
      updateSettings('realMoneyEnabled', false);
    }
  };

  const handleRealMoneyChange = (val) => {
    if (val) {
      setShowRealMoneyModal(true);
    } else {
      updateSettings('realMoneyEnabled', false);
    }
  };

  const confirmBrokerMode = () => {
    updateSettings('tradingMode', 'broker');
    setShowBrokerModal(false);
  };

  const confirmRealMoney = () => {
    updateSettings('realMoneyEnabled', true);
    setShowRealMoneyModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Details mini-card */}
        <View style={[styles.profileBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.avatarCircle}>
            <User size={24} color="#ffffff" />
          </View>
          <View style={styles.profileDetails}>
            <Text style={[styles.profileUsername, { color: theme.text }]}>@{userProfile?.username || 'trader_demo'}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{userProfile?.email || 'trader@apex.demo'}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>

        {/* 1. Trading Mode & Broker Bridge Configuration */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.groupHeader, { borderColor: theme.border }]}>
            <AlertTriangle size={16} color="#ffa726" />
            <Text style={[styles.groupHeaderTitle, { color: theme.text }]}>Trading Mode & Live Broker</Text>
          </View>

          {/* Mode Selector */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Execution Mode</Text>
            <View style={[styles.btnSelector, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
              {[
                { label: 'Paper Trading', value: 'paper' },
                { label: 'Live Broker', value: 'broker' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.selectorItem, settings.tradingMode === item.value && styles.selectorItemActive, settings.tradingMode === item.value && { backgroundColor: theme.accentLight }]}
                  onPress={() => handleTradingModeChange(item.value)}
                >
                  <Text style={[styles.selectorItemText, settings.tradingMode === item.value && styles.selectorTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {settings.tradingMode === 'broker' && (
            <View style={[styles.brokerConfigContainer, { borderColor: theme.border }]}>
              <View style={[styles.brokerTipCard, { backgroundColor: theme.isDark ? 'rgba(255, 167, 38, 0.08)' : 'rgba(255, 167, 38, 0.05)', borderColor: 'rgba(255, 167, 38, 0.2)' }]}>
                <Text style={styles.brokerTipTitle}>⚠️ LIVE BROKER CONNECTED</Text>
                <Text style={[styles.brokerTipText, { color: theme.textSecondary }]}>
                  Your trades will now simulate live routing to the stock exchange. Paper balances are disabled. Keep your API credentials secure.
                </Text>
              </View>

              {/* Broker Selection */}
              <View style={styles.settingRowCol}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select Active Broker Gateway</Text>
                <View style={[styles.btnSelectorMargin, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
                  {['Alpaca Markets', 'Interactive Brokers'].map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.selectorItem,
                        settings.broker === b && styles.selectorItemActive,
                        settings.broker === b && { backgroundColor: theme.accentLight },
                        { flex: 1, alignItems: 'center' }
                      ]}
                      onPress={() => updateSettings('broker', b)}
                    >
                      <Text style={[styles.selectorItemText, settings.broker === b && styles.selectorTextActive]}>
                        {b.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Client ID */}
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Client / Account ID</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', color: theme.text, borderColor: theme.border }]}
                  value={settings.clientId}
                  onChangeText={(val) => updateSettings('clientId', val)}
                  placeholder="e.g. ZER12345"
                  placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                  autoCapitalize="characters"
                />
              </View>

              {/* API Key */}
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Broker API Key</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', color: theme.text, borderColor: theme.border }]}
                  value={settings.apiKey}
                  onChangeText={(val) => updateSettings('apiKey', val)}
                  placeholder="e.g. api_key_secure_..."
                  placeholderTextColor={theme.isDark ? '#30363d' : '#9ca3af'}
                  secureTextEntry={true}
                />
              </View>

              {/* Add Real Money Toggle */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.settingLabel, { color: '#ef5350', fontWeight: 'bold' }]}>Real Money Execution</Text>
                  <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Route actual buy/sell orders and utilize live funds via API.</Text>
                </View>
                <Switch
                  value={settings.realMoneyEnabled}
                  onValueChange={handleRealMoneyChange}
                  trackColor={{ false: theme.isDark ? '#21262d' : '#d1d5db', true: '#ef5350' }}
                  thumbColor={settings.realMoneyEnabled ? '#ffffff' : '#808a9d'}
                />
              </View>
            </View>
          )}
        </View>

        {/* 2. Visual Options Group */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.groupHeader, { borderColor: theme.border }]}>
            <Monitor size={16} color="#ff5722" />
            <Text style={[styles.groupHeaderTitle, { color: theme.text }]}>Terminal Visual Interface</Text>
          </View>

          {/* Theme Selector */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Appearance Theme</Text>
            <View style={[styles.btnSelector, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
              {[
                { val: 'dark', label: 'DARK' },
                { val: 'light', label: 'LIGHT' },
                { val: 'system', label: 'SYSTEM' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.val}
                  style={[styles.selectorItem, settings.appearance === item.val && styles.selectorItemActive, settings.appearance === item.val && { backgroundColor: theme.accentLight }]}
                  onPress={() => updateSettings('appearance', item.val)}
                >
                  <Text style={[styles.selectorItemText, settings.appearance === item.val && styles.selectorTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Default Chart */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Default Chart Layout</Text>
            <View style={[styles.btnSelector, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
              {['candle', 'line'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.selectorItem, settings.defaultChartMode === type && styles.selectorItemActive, settings.defaultChartMode === type && { backgroundColor: theme.accentLight }]}
                  onPress={() => updateSettings('defaultChartMode', type)}
                >
                  <Text style={[styles.selectorItemText, settings.defaultChartMode === type && styles.selectorTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 3. Trading Margin Limits Group */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.groupHeader, { borderColor: theme.border }]}>
            <Sliders size={16} color="#2196f3" />
            <Text style={[styles.groupHeaderTitle, { color: theme.text }]}>Leverage & Margin Multipliers</Text>
          </View>

          {/* Intraday MIS Leverage */}
          <View style={styles.settingRowCol}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Intraday MIS Leverage Limit</Text>
            <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Enjoy amplified buying power for intraday positions.</Text>
            <View style={[styles.btnSelectorMargin, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
              {[5, 10, 20].map((leverage) => (
                <TouchableOpacity
                  key={leverage}
                  style={[
                    styles.selectorItem, 
                    settings.intradayLeverage === leverage && styles.selectorItemActive, 
                    settings.intradayLeverage === leverage && { backgroundColor: theme.accentLight },
                    { flex: 1, alignItems: 'center' }
                  ]}
                  onPress={() => updateSettings('intradayLeverage', leverage)}
                >
                  <Text style={[styles.selectorItemText, settings.intradayLeverage === leverage && styles.selectorTextActive]}>
                    {leverage}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ticking Frequency */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Data Streaming Frequency</Text>
            <View style={[styles.btnSelector, { backgroundColor: theme.isDark ? '#0c1017' : '#f3f4f6', borderColor: theme.border }]}>
              {['1s (Standard)', '5s (Eco)'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.selectorItem, settings.tickerFrequency === freq && styles.selectorItemActive, settings.tickerFrequency === freq && { backgroundColor: theme.accentLight }]}
                  onPress={() => updateSettings('tickerFrequency', freq)}
                >
                  <Text style={[styles.selectorItemText, settings.tickerFrequency === freq && styles.selectorTextActive]}>
                    {freq.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 4. Alerts & Sound Preferences */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.groupHeader, { borderColor: theme.border }]}>
            <Volume2 size={16} color="#ab47bc" />
            <Text style={[styles.groupHeaderTitle, { color: theme.text }]}>Notifications & Audio Alerts</Text>
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Order Trade Sounds</Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Play confirmation audio alerts upon execution.</Text>
            </View>
            <Switch
              value={settings.soundAlerts}
              onValueChange={(val) => updateSettings('soundAlerts', val)}
              trackColor={{ false: theme.isDark ? '#21262d' : '#d1d5db', true: '#26a69a' }}
              thumbColor={settings.soundAlerts ? '#ffffff' : '#808a9d'}
            />
          </View>
        </View>

        {/* 5. Apex Suite Brand Details */}
        <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.groupHeader, { borderColor: theme.border }]}>
            <Shield size={16} color="#4caf50" />
            <Text style={[styles.groupHeaderTitle, { color: theme.text }]}>Terminal Core Integrity</Text>
          </View>
          <View style={styles.metaInfoRow}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Apex Suite Version</Text>
            <Text style={[styles.metaVal, { color: theme.text }]}>v1.1.0-Stable</Text>
          </View>
          <View style={styles.metaInfoRow}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Security Status</Text>
            <Text style={[styles.metaVal, { color: '#26a69a', fontWeight: 'bold' }]}>Simulated AES-256 Connected</Text>
          </View>
          <View style={styles.metaInfoRow}>
            <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Active Market Feed</Text>
            <Text style={[styles.metaVal, { color: theme.text }]}>Live Yahoo Finance Feed</Text>
          </View>
        </View>

        {/* Log Out button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logoutAction}>
          <LogOut size={16} color="#ef5350" style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>LOG OUT FROM TERMINAL</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- WARNING MODAL: LIVE BROKER ACCESS --- */}
      <Modal visible={showBrokerModal} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.warningModalContent, { backgroundColor: theme.card, borderColor: '#ffa726' }]}>
            <AlertTriangle size={48} color="#ffa726" style={styles.warningIcon} />
            <Text style={[styles.warningTitle, { color: theme.text }]}>Live Broker Access Gateway</Text>
            <Text style={[styles.warningText, { color: theme.textSecondary }]}>
              You are enabling **Live Broker Mode**. Connecting to a real broker account requires active Client IDs, API Secret keys, and funding through your broker's platform.
            </Text>
            <Text style={[styles.warningSubText, { backgroundColor: theme.isDark ? 'rgba(255, 167, 38, 0.06)' : 'rgba(255, 167, 38, 0.08)', color: '#ffa726' }]}>
              ℹ️ API subscriptions and data fees may apply for live broker connections. Always secure your API secret keys.
            </Text>
            <View style={styles.warningBtnRow}>
              <TouchableOpacity style={[styles.warningCancelBtn, { backgroundColor: theme.isDark ? '#161b22' : '#f3f4f6', borderColor: theme.border }]} onPress={() => setShowBrokerModal(false)}>
                <Text style={[styles.warningCancelText, { color: theme.textSecondary }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.warningConfirmBtn} onPress={confirmBrokerMode}>
                <Text style={styles.warningConfirmText}>ACTIVATE BRIDGE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- WARNING MODAL: REAL MONEY EXECUTION --- */}
      <Modal visible={showRealMoneyModal} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.warningModalContent, { backgroundColor: theme.card, borderColor: '#ef5350' }]}>
            <AlertTriangle size={48} color="#ef5350" style={styles.warningIcon} />
            <Text style={[styles.warningTitle, { color: '#ef5350' }]}>⚠️ Real Money Capital Risk Warning</Text>
            <Text style={[styles.warningText, { color: theme.textSecondary }]}>
              By enabling **Real Money Execution**, you are authorizing the routing of buy and sell transactions using your actual financial capital.
            </Text>
            <Text style={[styles.warningSubText, { backgroundColor: theme.isDark ? 'rgba(239, 83, 80, 0.06)' : 'rgba(239, 83, 80, 0.08)', color: '#ef5350', fontWeight: 'bold' }]}>
              CRITICAL: Trading in equities, derivatives, or indices involves high risk. This demo app acts as a mock broker-bridge. All execution details will be simulated to keep your real capital 100% secure.
            </Text>
            <View style={styles.warningBtnRow}>
              <TouchableOpacity style={[styles.warningCancelBtn, { backgroundColor: theme.isDark ? '#161b22' : '#f3f4f6', borderColor: theme.border }]} onPress={() => setShowRealMoneyModal(false)}>
                <Text style={[styles.warningCancelText, { color: theme.textSecondary }]}>DISMISS RISK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.warningConfirmBtn, { backgroundColor: '#ef5350' }]} onPress={confirmRealMoney}>
                <Text style={styles.warningConfirmText}>ENABLE REAL MONEY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 15,
    marginBottom: 15,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff5722',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0c1017',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  profileUsername: {
    color: '#c9d1d9',
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#808a9d',
    fontSize: 11.5,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: 'rgba(38, 166, 154, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(38, 166, 154, 0.2)',
  },
  activeBadgeText: {
    color: '#26a69a',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  settingsGroup: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#21262d',
    paddingBottom: 8,
  },
  groupHeaderTitle: {
    color: '#c9d1d9',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settingRowCol: {
    flexDirection: 'column',
    marginVertical: 8,
  },
  settingLabel: {
    color: '#c9d1d9',
    fontSize: 13,
  },
  settingSubLabel: {
    color: '#808a9d',
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 14,
  },
  btnSelector: {
    flexDirection: 'row',
    backgroundColor: '#0c1017',
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  btnSelectorMargin: {
    flexDirection: 'row',
    backgroundColor: '#0c1017',
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: '#30363d',
    marginTop: 10,
  },
  selectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  selectorItemActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
  },
  selectorItemText: {
    color: '#808a9d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectorTextActive: {
    color: '#ff5722',
  },
  metaInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  metaLabel: {
    color: '#808a9d',
    fontSize: 12,
  },
  metaVal: {
    color: '#c9d1d9',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.25)',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 30,
  },
  logoutBtnText: {
    color: '#ef5350',
    fontSize: 12.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  // NEW styles for Broker Configurations
  brokerConfigContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderColor: '#21262d',
    paddingTop: 15,
    gap: 15,
  },
  brokerTipCard: {
    backgroundColor: 'rgba(255, 167, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 167, 38, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  brokerTipTitle: {
    color: '#ffa726',
    fontSize: 11,
    fontWeight: 'bold',
  },
  brokerTipText: {
    color: '#808a9d',
    fontSize: 10.5,
    marginTop: 4,
    lineHeight: 14,
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
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    color: '#c9d1d9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'monospace',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  warningModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#ffa726',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 15,
  },
  warningTitle: {
    color: '#c9d1d9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  warningText: {
    color: '#808a9d',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 15,
  },
  warningSubText: {
    color: '#ffa726',
    fontSize: 10.5,
    backgroundColor: 'rgba(255, 167, 38, 0.06)',
    padding: 10,
    borderRadius: 8,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  warningCancelBtn: {
    flex: 1,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningCancelText: {
    color: '#808a9d',
    fontSize: 11,
    fontWeight: 'bold',
  },
  warningConfirmBtn: {
    flex: 1,
    backgroundColor: '#ff9800',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningConfirmText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
