/**
 * PlanSelectionScreen - Selección de Plan (Gratuito o Premium)
 * El usuario puede elegir entre plan gratuito o premium con características avanzadas
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CamperSitesTheme as theme } from '../theme';
import { AppConfig } from '../config/AppConfig';
import { supabase } from '../lib/supabase';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period?: string;
  features: string[];
  popular?: boolean;
}

interface PlanSelectionScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function PlanSelectionScreen({ onComplete, onSkip }: PlanSelectionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [loading, setLoading] = useState(false);

  const plans: Plan[] = [
    AppConfig.PLANS.FREE,
    { ...AppConfig.PLANS.PREMIUM, popular: true },
  ];

  const handleContinue = async () => {
    setLoading(true);

    try {
      // Guardar la selección del plan en el perfil del usuario
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No hay usuario autenticado');
        setLoading(false);
        return;
      }

      // Actualizar metadata del usuario con el plan seleccionado
      const { error } = await supabase.auth.updateUser({
        data: {
          plan: selectedPlan,
          plan_started_at: new Date().toISOString(),
        },
      });

      if (error) throw error;

      // Si es premium, aquí se integraría con pasarela de pago
      if (selectedPlan === 'premium') {
        Alert.alert(
          '¡Plan Premium Seleccionado!',
          'Te redirigiremos a la configuración de pago para activar tu suscripción.',
          [{ text: 'Continuar', onPress: onComplete }]
        );
      } else {
        Alert.alert(
          '¡Plan Gratuito Activado!',
          'Puedes empezar a usar CamperSites Pro. Siempre puedes actualizar a Premium más tarde.',
          [{ text: 'Empezar', onPress: onComplete }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar tu selección');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="star-circle" size={48} color={theme.colors.primary.main} />
        </View>
        <Text style={styles.title}>Elige tu Plan</Text>
        <Text style={styles.subtitle}>
          Comienza gratis o desbloquea todas las funciones con Premium
        </Text>
      </View>

      {/* Plan Cards */}
      {plans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            selectedPlan === plan.id && styles.planCardSelected,
            plan.popular && styles.planCardPopular,
          ]}
          onPress={() => setSelectedPlan(plan.id)}
          activeOpacity={0.7}>
          
          {plan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
            </View>
          )}

          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{plan.name}</Text>
              {plan.price > 0 ? (
                <Text style={styles.planPrice}>
                  {plan.price}{plan.currency}/{plan.period}
                </Text>
              ) : (
                <Text style={styles.planPrice}>Gratis</Text>
              )}
            </View>
            <View style={[
              styles.radioButton,
              selectedPlan === plan.id && styles.radioButtonSelected,
            ]}>
              {selectedPlan === plan.id && (
                <Icon name="check-circle" size={24} color="#FFFFFF" />
              )}
            </View>
          </View>

          <View style={styles.featuresList}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon 
                  name="check-circle" 
                  size={18} 
                  color={theme.colors.success.main} 
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Icon name="information-outline" size={20} color={theme.colors.primary.main} />
        <Text style={styles.infoText}>
          Puedes cambiar de plan en cualquier momento desde tu perfil.
        </Text>
      </View>

      {/* Botones de acción */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>
              {selectedPlan === 'premium' ? 'Activar Premium' : 'Comenzar Gratis'}
            </Text>
          )}
        </TouchableOpacity>

        {selectedPlan === 'free' && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={loading}>
            <Text style={styles.skipButtonText}>Quizás más tarde</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: theme.colors.background.light,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: theme.colors.primary.main,
    backgroundColor: theme.colors.primary.light + '20',
  },
  planCardPopular: {
    borderColor: theme.colors.accent.gold,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.accent.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary.main,
    marginTop: 4,
  },
  radioButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.light + '30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.text.hint,
    fontSize: 14,
  },
});
