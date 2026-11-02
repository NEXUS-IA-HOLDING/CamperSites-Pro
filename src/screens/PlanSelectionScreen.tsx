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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [loading, setLoading] = useState(false);

  const plans: Plan[] = [
    { ...AppConfig.PLANS.PREMIUM, popular: true },
    AppConfig.PLANS.FREE,
  ];

  const handleContinue = async () => {
    setLoading(true);

    try {
      // Guardar localmente siempre para funcionamiento offline y sin fricción
      await AsyncStorage.setItem('@camper_user_plan', selectedPlan);

      // Intentar sincronizar con Supabase si hay usuario activo
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.auth.updateUser({
            data: {
              plan: selectedPlan,
              plan_started_at: new Date().toISOString(),
            },
          });
        }
      } catch (cloudErr) {
        console.log('Plan guardado localmente (modo offline):', cloudErr);
      }

      onComplete();
    } catch (error: any) {
      console.warn('Error en selección de plan:', error);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logotipo en el fondo bien centrado cubriendo la pantalla */}
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.backgroundCenteredLogo}
        resizeMode="contain"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoThumb}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Elige tu Plan Nómade</Text>
          <Text style={styles.subtitle}>
            Acceso a navegación GPS de gálibo, alertas de radar y pernocta segura
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
            activeOpacity={0.8}>
            
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>RECOMENDADO</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                {plan.price > 0 ? (
                  <Text style={styles.planPrice}>
                    {plan.price} {plan.currency}/{plan.period}
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
                  <Icon name="check-circle" size={24} color="#0F172A" />
                )}
              </View>
            </View>

            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Icon 
                    name="check-circle-outline" 
                    size={18} 
                    color="#10B981" 
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="shield-check-outline" size={20} color="#38BDF8" />
          <Text style={styles.infoText}>
            Puedes cambiar de plan en cualquier momento desde tu perfil o Ajustes.
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
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>
                {selectedPlan === 'premium' ? 'Continuar con Plan Pro' : 'Comenzar Gratis'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={loading}>
            <Text style={styles.skipButtonText}>Continuar al cuestionario ➔</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundCenteredLogo: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    alignSelf: 'center',
    top: '5%',
    opacity: 0.08,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  logoThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  planCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#1A2942',
  },
  planCardPopular: {
    borderColor: '#F59E0B',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 2,
  },
  radioButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#CBD5E1',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  actions: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  skipButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
