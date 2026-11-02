/**
 * AuthScreen - Login y Registro con Supabase Auth
 * CamperSites Pro - YRYS
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { CamperSitesTheme as theme } from '../theme';
import {
  sanitizeInput,
  isValidEmail,
  validatePassword,
  checkRateLimit,
  registerSession,
  logSecurityEvent,
} from '../lib/security';
import { activateAdminByCode } from '../lib/adminAuth';

type AuthMode = 'login' | 'register';

// ⚠️ IMPORTANTE: El código maestro debe configurarse vía variable de entorno
// NO poner códigos reales en el código fuente
const MASTER_ADMIN_CODE = process.env.EXPO_PUBLIC_MASTER_ADMIN_CODE || '';

export default function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar email con security service
    const cleanEmail = sanitizeInput(email.trim(), 254);
    if (!cleanEmail) {
      newErrors.email = 'El email es obligatorio';
    } else if (!isValidEmail(cleanEmail)) {
      newErrors.email = 'Email no válido';
    }

    // Validar password
    if (!password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (mode === 'register') {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        newErrors.password = pwCheck.errors[0];
      }
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    // Validar nombre (sanitizado)
    if (mode === 'register') {
      const cleanName = sanitizeInput(displayName.trim(), 50);
      if (!cleanName) {
        newErrors.displayName = 'El nombre es obligatorio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    // Rate limiting anti-brute-force
    if (!checkRateLimit('login')) {
      Alert.alert(
        'Demasiados intentos',
        'Has intentado iniciar sesión demasiadas veces. Espera 5 minutos.',
      );
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = sanitizeInput(email.trim(), 254);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // Log intento fallido
        logSecurityEvent('login_failed', { email: cleanEmail });

        if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Error', 'Email o contraseña incorrectos');
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      // Login exitoso: registrar sesión + log
      await registerSession();
      logSecurityEvent('login_success', { email: cleanEmail });

      onAuthSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // Verificar si el código de referido es el código maestro de admin
      let isAdmin = false;
      if (referralCode.trim() === MASTER_ADMIN_CODE) {
        isAdmin = true;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            referral_code: sanitizeInput(referralCode.trim(), 50),
            is_admin: isAdmin,
            plan: isAdmin ? 'premium' : 'free',
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert('Error', 'Este email ya está registrado. Inicia sesión.');
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      // Si es admin, activar la sesión de administrador automáticamente
      if (isAdmin) {
        await activateAdminByCode(MASTER_ADMIN_CODE);
        Alert.alert(
          '¡Cuenta de Administrador Creada!',
          'Tienes acceso completo a todas las funcionalidades. Revisa tu email para confirmar tu cuenta.',
          [{ text: 'OK', onPress: () => setMode('login') }],
        );
      } else {
        Alert.alert(
          '¡Cuenta creada!',
          'Revisa tu email para confirmar tu cuenta.',
          [{ text: 'OK', onPress: () => setMode('login') }],
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const handleSkip = () => {
    onAuthSuccess();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Marca de agua elegante en el fondo */}
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.backgroundWatermark}
        resizeMode="contain"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Logo oficial y título */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>CamperSites Pro</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>GPS & COMUNIDAD NÓMADE</Text>
          </View>
          <Text style={styles.tagline}>Tu copiloto definitivo para autocaravanas y campers</Text>
        </View>

        {/* Tabs Login / Registro */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => {
              setMode('login');
              setErrors({});
            }}>
            <Text
              style={[
                styles.tabText,
                mode === 'login' && styles.tabTextActive,
              ]}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => {
              setMode('register');
              setErrors({});
            }}>
            <Text
              style={[
                styles.tabText,
                mode === 'register' && styles.tabTextActive,
              ]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.displayName ? styles.inputError : null,
                ]}>
                <Icon
                  name="account"
                  size={20}
                  color={theme.colors.text.hint}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre de viajero"
                  placeholderTextColor={theme.colors.text.hint}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
              {errors.displayName && (
                <Text style={styles.errorText}>{errors.displayName}</Text>
              )}
            </View>
          )}

          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Código de Referido (opcional)
              </Text>
              <View style={styles.inputContainer}>
                <Icon
                  name="gift-outline"
                  size={20}
                  color={theme.colors.text.hint}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Código de amigo o admin"
                  placeholderTextColor={theme.colors.text.hint}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.inputHint}>
                ¿Tienes un código de administrador? Ingrésalo aquí para acceso
                completo.
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                errors.email ? styles.inputError : null,
              ]}>
              <Icon
                name="email-outline"
                size={20}
                color={theme.colors.text.hint}
              />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={theme.colors.text.hint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View
              style={[
                styles.inputContainer,
                errors.password ? styles.inputError : null,
              ]}>
              <Icon
                name="lock-outline"
                size={20}
                color={theme.colors.text.hint}
              />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={theme.colors.text.hint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={theme.colors.text.hint}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Boton principal */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Separador */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Skip */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>
              Continuar sin cuenta
            </Text>
            <Icon
              name="arrow-right"
              size={18}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundWatermark: {
    position: 'absolute',
    width: 380,
    height: 380,
    top: -50,
    right: -70,
    opacity: 0.08,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  proBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  tagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#0284C7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Form
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
    padding: 0,
  },
  inputHint: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    fontSize: 13,
    color: '#64748B',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
