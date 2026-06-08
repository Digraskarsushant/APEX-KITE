import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Image } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Polygon } from 'react-native-svg';
import { User, Lock, Mail, ChevronRight, Info, ShieldCheck, RefreshCw, X, Eye, EyeOff } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

// Razor-sharp SVG Origami Kite Logo
function ApexLogo({ isDark }) {
  // Navy colors for light mode, Slate/White colors for dark mode
  const leftTop = isDark ? "#f8fafc" : "#2563eb";
  const rightTop = isDark ? "#f1f5f9" : "#1d4ed8";
  const leftBottom = isDark ? "#e2e8f0" : "#1e40af";
  const rightBottom = isDark ? "#cbd5e1" : "#1e3a8a";
  const accent = isDark ? "#94a3b8" : "#172554";

  return (
    <View style={styles.logoContainer}>
      <Svg width={90} height={90} viewBox="0 0 100 100">
        {/* Left Top Quadrant */}
        <Polygon points="50,10 15,45 50,45" fill={leftTop} stroke={leftTop} strokeWidth="1" strokeLinejoin="round" />
        {/* Right Top Quadrant */}
        <Polygon points="50,10 85,45 50,45" fill={rightTop} stroke={rightTop} strokeWidth="1" strokeLinejoin="round" />
        {/* Left Bottom Quadrant */}
        <Polygon points="50,95 15,45 50,45" fill={leftBottom} stroke={leftBottom} strokeWidth="1" strokeLinejoin="round" />
        {/* Right Bottom Quadrant */}
        <Polygon points="50,95 85,45 50,45" fill={rightBottom} stroke={rightBottom} strokeWidth="1" strokeLinejoin="round" />
        
        {/* Center lines for origami fold effect */}
        <Path d="M50,10 L50,95" stroke={accent} strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
        <Path d="M15,45 L85,45" stroke={accent} strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function AuthScreen() {
  const { loginAction, registerAction, requestOtpAction, theme } = useApp();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (authMode === 'login') {
      const res = await loginAction(username, password);
      setLoading(false);
      if (!res.success) {
        setErrorAlert(res.error);
      }
    } else {
      // Register Mode: Direct registration without OTP!
      const res = await registerAction(username, email, password);
      setLoading(false);
      if (!res.success) {
        setErrorAlert(res.error);
      }
    }
  };

  const isLogin = authMode === 'login';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.glassCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Branding header */}
        <ApexLogo isDark={theme.isDark} />
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
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)} style={styles.eyeIconWrapper}>
              {showPassword ? (
                <EyeOff size={16} color={theme.textSecondary} />
              ) : (
                <Eye size={16} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Lock size={16} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.isDark ? '#484f58' : '#9ca3af'}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)} style={styles.eyeIconWrapper}>
                {showConfirmPassword ? (
                  <EyeOff size={16} color={theme.textSecondary} />
                ) : (
                  <Eye size={16} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
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
  eyeIconWrapper: {
    paddingLeft: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#ff5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#808a9d',
    lineHeight: 18,
    marginBottom: 20,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  modalErrorText: {
    color: '#ef5350',
    fontSize: 11.5,
    flex: 1,
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1017',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  otpTextInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 12,
    outlineStyle: 'none',
  },
  verifySubmitBtn: {
    backgroundColor: '#ff5722',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  verifySubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  resendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  resendTimerText: {
    fontSize: 12,
    color: '#808a9d',
  },
  resendLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  resendLinkText: {
    color: '#ff5722',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
