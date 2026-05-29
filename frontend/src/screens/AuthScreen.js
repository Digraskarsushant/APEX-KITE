import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { User, Lock, Mail, ChevronRight, Info } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

// Beautiful upward helix exponential logo drawn in SVG
function ApexLogo() {
  return (
    <View style={styles.logoContainer}>
      <Svg width={90} height={90} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="logoGrad" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ff9800" />
            <Stop offset="100%" stopColor="#ff5722" />
          </LinearGradient>
        </Defs>
        {/* Double-helix upward financial trend arrows */}
        <Path
          d="M20,80 Q40,40 60,60 T100,20"
          fill="none"
          stroke="url(#logoGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M10,90 Q30,50 50,70 T90,30"
          fill="none"
          stroke="rgba(255, 87, 34, 0.3)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="4,4"
        />
        {/* Glowing node point at apex arrow */}
        <Circle cx="100" cy="20" r="6" fill="#ff5722" />
        <Circle cx="90" cy="30" r="4" fill="#ff9800" />
      </Svg>
    </View>
  );
}

export default function AuthScreen() {
  const { loginAction, registerAction, theme } = useApp();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  const [username, setUsername] = useState('trader_demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');

  const handleAuthSubmit = async () => {
    if (!username || !password) {
      setErrorAlert('Username and password fields are required.');
      return;
    }

    if (authMode === 'register') {
      if (!email) {
        setErrorAlert('Email field is required.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorAlert('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    setErrorAlert('');

    let res;
    if (authMode === 'login') {
      res = await loginAction(username, password);
    } else {
      res = await registerAction(username, email, password);
    }

    setLoading(false);
    if (!res.success) {
      setErrorAlert(res.error);
    }
  };

  const isLogin = authMode === 'login';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.glassCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Branding header */}
        <ApexLogo />
        <Text style={[styles.brandTitle, { color: theme.text }]}>APEX KITE</Text>
        <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>High-Frequency Trading Terminal Suite</Text>

        {/* Tab switch buttons */}
        <View style={[styles.tabBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive, isLogin && { backgroundColor: theme.accentLight }]}
            onPress={() => {
              setAuthMode('login');
              setErrorAlert('');
            }}
          >
            <Text style={[styles.tabText, { color: theme.textSecondary }, isLogin && styles.tabTextActive, isLogin && { color: theme.accent }]}>LOGIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive, !isLogin && { backgroundColor: theme.accentLight }]}
            onPress={() => {
              setAuthMode('register');
              setErrorAlert('');
            }}
          >
            <Text style={[styles.tabText, { color: theme.textSecondary }, !isLogin && styles.tabTextActive, !isLogin && { color: theme.accent }]}>REGISTER</Text>
          </TouchableOpacity>
        </View>

        {/* Auth Error Display */}
        {errorAlert !== '' && (
          <View style={styles.errorBox}>
            <Info size={14} color="#ef5350" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorAlert}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Username */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <User size={16} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Username or Email"
              placeholderTextColor={theme.isDark ? '#484f58' : '#9ca3af'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Email (Register only) */}
          {!isLogin && (
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Mail size={16} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Email Address"
                placeholderTextColor={theme.isDark ? '#484f58' : '#9ca3af'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Password */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Lock size={16} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Security Password"
              placeholderTextColor={theme.isDark ? '#484f58' : '#9ca3af'}
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Lock size={16} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.isDark ? '#484f58' : '#9ca3af'}
                secureTextEntry={true}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Action Trigger Button */}
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.accent }]} onPress={handleAuthSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContentRow}>
                <Text style={styles.submitBtnText}>
                  {isLogin ? 'AUTHENTICATE & ENTER' : 'CREATE APEX ACCOUNT'}
                </Text>
                <ChevronRight size={16} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.copyrightText, { color: theme.textSecondary }]}>
        Apex Kite Terminal v1.0.0 — Secured with simulated AES-256 sessioning
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1017',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#ff5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  logoContainer: {
    marginBottom: 10,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    color: '#808a9d',
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0c1017',
    borderRadius: 8,
    padding: 4,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
  },
  tabText: {
    color: '#808a9d',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#ff5722',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 15,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 11.5,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#c9d1d9',
    fontSize: 14,
    paddingVertical: 10,
    outlineStyle: 'none', // removes blue box on web
  },
  submitBtn: {
    backgroundColor: '#ff5722',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  copyrightText: {
    color: '#484f58',
    fontSize: 10,
    marginTop: 20,
    textAlign: 'center',
  },
});
