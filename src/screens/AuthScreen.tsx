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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';
import { CamperSitesTheme as theme } from '../theme';

type AuthMode = 'login' | 'register';

export default function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email no válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    if (mode === 'register' && !displayName.trim()) {
      newErrors.displayName = 'El nombre es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Error', 'Email o contraseña incorrectos');
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

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
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
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

      Alert.alert(
        '¡Cuenta creada!',
        'Revisa tu email para confirmar tu cuenta.',
        [{ text: 'OK', onPress: () => setMode('login') }],
      );
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Logo y titulo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="van-utility" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>CamperSites Pro</Text>
          <Text style={styles.tagline}>Tu compañero de ruta</Text>
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
    backgroundColor: theme.colors.background.main,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.lg,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.primary.dark,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.light,
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.sm,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.primary.main,
  },
  // Form
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.light,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 10,
  },
  inputError: {
    borderColor: theme.colors.alerts.radar,
    backgroundColor: theme.colors.alerts.radar + '08',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.alerts.radar,
    marginLeft: 4,
  },
  // Submit button
  submitButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...theme.shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.text.disabled,
  },
  dividerText: {
    fontSize: 14,
    color: theme.colors.text.hint,
    marginHorizontal: 16,
  },
  // Skip
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
});
