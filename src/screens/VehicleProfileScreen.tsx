/**
 * VehicleProfileScreen - Configuración del Perfil del Vehículo con Asistente IA
 * Permite al usuario ingresar las características de su vehículo mediante conversación interactiva
 * Optimización de rutas con IA basada en preferencias individuales y tratamiento privado de datos
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../lib/security';
import { Logger } from '../utils/logger';
import { profileAssistantService, VehicleProfileData, ConversationStep } from '../services/ProfileAssistantService';
import { VehicleCatalogModal } from '../components/VehicleCatalogModal';
import { UserVehicleSetup } from '../services/VehicleCatalogService';

interface VehicleProfileScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function VehicleProfileScreen({ onComplete, onSkip }: VehicleProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [currentStep, setCurrentStep] = useState<ConversationStep | null>(null);
  const [profileData, setProfileData] = useState<Partial<VehicleProfileData>>({
    drivingStyle: 'balanced',
    avoidTolls: false,
    avoidHighways: false,
    maxSlopePreference: 'medium',
  });
  const [inputValue, setInputValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  const handleVehicleSavedFromCatalog = async (setup: UserVehicleSetup) => {
    setShowCatalogModal(false);
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('@camper_profile_completed', 'true');
      await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
      Alert.alert(
        '¡Vehículo Configurado!',
        `Se ha guardado tu ${setup.brand} ${setup.model} (${setup.height}m / ${setup.length}m) con motor de ${setup.horsepower} CV.`,
        [{ text: 'Comenzar a Viajar', onPress: onComplete }]
      );
    } catch (e) {
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  // Iniciar conversación al montar
  useEffect(() => {
    startConversation();
  }, []);

  const startConversation = () => {
    const firstStep = profileAssistantService.getInitialStep();
    setCurrentStep(firstStep);
    setCurrentStepIndex(0);
    setInputValue('');
    setLoading(false);
  };

  const handleContinue = async () => {
    if (!currentStep) return;

    if (currentStep.type === 'number') {
      const numValue = parseFloat(inputValue);
      if (isNaN(numValue) || numValue <= 0) {
        Alert.alert('Valor inválido', 'Por favor ingresa un número válido mayor a 0');
        return;
      }
      setProfileData(prev => ({ ...prev, [currentStep.field]: numValue }));
    } else if (currentStep.type === 'text') {
      const sanitized = sanitizeInput(inputValue.trim(), 50);
      if (!sanitized) {
        Alert.alert('Campo requerido', 'Por favor ingresa una respuesta');
        return;
      }
      setProfileData(prev => ({ ...prev, [currentStep.field]: sanitized }));
    }

    // Avanzar al siguiente paso
    const nextStep = profileAssistantService.getNextStep(currentStepIndex, {
      ...profileData,
      [currentStep.field]: currentStep.type === 'boolean' 
        ? !(profileData[currentStep.field] as boolean) 
        : (currentStep.type === 'number' ? parseFloat(inputValue) : inputValue),
    });

    if (nextStep) {
      setCurrentStep(nextStep);
      setCurrentStepIndex(prev => prev + 1);
      setInputValue('');
    } else {
      // Conversación completada
      await saveProfile();
    }
  };

  const handleOptionSelect = async (value: any) => {
    if (!currentStep) return;

    const processedData = profileAssistantService.processAnswer(currentStep, value);
    const updatedData = { ...profileData, ...processedData };
    setProfileData(updatedData);

    const nextStep = profileAssistantService.getNextStep(currentStepIndex, updatedData);

    if (nextStep) {
      setCurrentStep(nextStep);
      setCurrentStepIndex(prev => prev + 1);
    } else {
      await saveProfile();
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      // Datos por defecto para campos opcionales no completados
      const completeProfile: VehicleProfileData = {
        vehicleType: profileData.vehicleType || 'camper',
        profileMode: profileData.profileMode || (profileData.vehicleType === 'truck' ? 'truck' : profileData.vehicleType === 'delivery' ? 'delivery' : 'camper'),
        height: profileData.height || 2.8,
        width: profileData.width || 2.2,
        length: profileData.length || 6.0,
        weight: profileData.weight || 3500,
        axles: profileData.axles || 2,
        fuelType: profileData.fuelType || 'diesel',
        rangeKm: profileData.rangeKm || 650,
        tankCapacity: profileData.tankCapacity || 80,
        avgConsumption: profileData.avgConsumption || 9.5,
        environmentalBadge: profileData.environmentalBadge || 'C',
        engineYear: profileData.engineYear || 2015,
        engineCC: profileData.engineCC || 2000,
        drivingStyle: profileData.drivingStyle || 'balanced',
        avoidTolls: profileData.avoidTolls || false,
        avoidHighways: profileData.avoidHighways || false,
        maxSlopePreference: profileData.maxSlopePreference || 'medium',
      };

      const sanitizedData = profileAssistantService.sanitizeProfileData(completeProfile);

      // 1. Guardar de forma ultra-robusta en almacenamiento local (AsyncStorage)
      try {
        await AsyncStorage.setItem('@camper_vehicle_config', JSON.stringify({
          type: sanitizedData.vehicleType,
          height: sanitizedData.height?.toString() || '2.8',
          width: sanitizedData.width?.toString() || '2.2',
          length: sanitizedData.length?.toString() || '6.0',
          weight: sanitizedData.weight?.toString() || '3500',
          axles: sanitizedData.axles?.toString() || '2',
          fuelType: sanitizedData.fuelType || 'diesel',
          rangeKm: sanitizedData.rangeKm?.toString() || '650',
          environmentalBadge: sanitizedData.environmentalBadge || 'C',
          name: sanitizedData.vehicleType === 'truck' ? 'Mi Camión Pesado' : 'Mi Autocaravana / Camper',
        }));
        await AsyncStorage.setItem('@camper_profile_completed', 'true');
        await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
      } catch (storageErr) {
        Logger.warn('VehicleProfile', 'Error guardando en local:', storageErr);
      }

      // 2. Intentar sincronizar con la nube (Supabase) si hay sesión activa
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('vehicle_profiles')
            .upsert({
              user_id: user.id,
              vehicle_type: sanitizedData.vehicleType,
              height: sanitizedData.height,
              width: sanitizedData.width,
              length: sanitizedData.length,
              weight: sanitizedData.weight,
              axles: sanitizedData.axles,
              fuel_type: sanitizedData.fuelType,
              range_km: sanitizedData.rangeKm,
              tank_capacity: sanitizedData.tankCapacity,
              avg_consumption: sanitizedData.avgConsumption,
              environmental_badge: sanitizedData.environmentalBadge,
              engine_year: sanitizedData.engineYear,
              engine_cc: sanitizedData.engineCC,
              driving_style: sanitizedData.drivingStyle,
              avoid_tolls: sanitizedData.avoidTolls,
              avoid_highways: sanitizedData.avoidHighways,
              max_slope_preference: sanitizedData.maxSlopePreference,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });
        }
      } catch (cloudErr) {
        Logger.warn('VehicleProfile', 'Perfil guardado offline (nube no disponible):', cloudErr);
      }

      Logger.info('VehicleProfile', 'Perfil de vehículo guardado exitosamente');
      
      Alert.alert(
        '¡Perfil Completado!',
        'Tu vehículo ha sido configurado. Ahora el GPS adaptará las alturas, puentes y giros.',
        [
          {
            text: 'Empezar a Conducir',
            onPress: onComplete,
          },
        ]
      );
    } catch (error: any) {
      Logger.error('VehicleProfile', 'Error en saveProfile:', error);
      // Fallback seguro: si algo falla, no bloquear al usuario
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const skipProfile = () => {
    Alert.alert(
      'Omitir configuración',
      '¿Deseas continuar con las medidas estándar de autocaravana? Podrás modificarlas en cualquier momento desde tu Perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'default',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('@camper_vehicle_config', JSON.stringify({
                type: 'camper',
                height: '2.8',
                width: '2.2',
                length: '6.0',
                weight: '3500',
                name: 'Mi Autocaravana / Camper',
              }));
              await AsyncStorage.setItem('@camper_profile_completed', 'true');
              await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
            } catch (e) {
              Logger.warn('VehicleProfile', 'Error guardando config por defecto', e);
            }
            onSkip();
          },
        },
      ]
    );
  };

  const renderInput = () => {
    if (!currentStep) return null;

    if (currentStep.type === 'select' && currentStep.options) {
      return (
        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {currentStep.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleOptionSelect(option.value)}
              activeOpacity={0.75}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              <Icon name="chevron-right" size={24} color="#38BDF8" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (currentStep.type === 'boolean') {
      const currentValue = profileData[currentStep.field] as boolean || false;
      return (
        <View style={styles.booleanContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !currentValue && styles.toggleButtonActive]}
            onPress={() => handleOptionSelect(false)}
            activeOpacity={0.75}
          >
            <Icon name={!currentValue ? 'check-circle' : 'circle-outline'} size={24} color={!currentValue ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.toggleText, !currentValue && styles.toggleTextActive]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, currentValue && styles.toggleButtonActive]}
            onPress={() => handleOptionSelect(true)}
            activeOpacity={0.75}
          >
            <Icon name={currentValue ? 'check-circle' : 'circle-outline'} size={24} color={currentValue ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.toggleText, currentValue && styles.toggleTextActive]}>Sí</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          placeholder="Escribe tu respuesta..."
          placeholderTextColor="#64748B"
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType={currentStep.type === 'number' ? 'decimal-pad' : 'default'}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
      </View>
    );
  };

  const progress = currentStepIndex >= 0 
    ? ((currentStepIndex + 1) / profileAssistantService.getTotalSteps()) * 100 
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Preparando asistente...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logotipo en el fondo bien centrado cubriendo la pantalla */}
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.backgroundCenteredLogo}
        resizeMode="contain"
      />

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogoThumb}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Asistente de Configuración</Text>
        <Text style={styles.subtitle}>Configura el gálibo y medidas de tu vehículo para evitar puentes bajos y calles estrechas</Text>
      </View>

      {/* Acceso directo al Catálogo Oficial de Vehículos */}
      <TouchableOpacity
        style={styles.catalogBannerBtn}
        activeOpacity={0.85}
        onPress={() => setShowCatalogModal(true)}>
        <Icon name="book-open-page-variant" size={20} color="#38BDF8" style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.catalogBannerTitle}>¿Elegir modelo del Catálogo Oficial?</Text>
          <Text style={styles.catalogBannerSub}>Medidas exactas de Fiat Ducato, VW, Ford, Benimar, etc.</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#38BDF8" />
      </TouchableOpacity>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {currentStep && (
          <View style={styles.stepContainer}>
            <View style={styles.questionBubble}>
              <View style={styles.questionIconBox}>
                <Icon name="van-utility" size={24} color="#38BDF8" />
              </View>
              <Text style={styles.question}>{currentStep.question}</Text>
            </View>
            
            <View style={styles.inputContainer}>
              {renderInput()}
            </View>

            {(currentStep.type === 'number' || currentStep.type === 'text') && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continuar →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipProfile}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          <Icon name="skip-forward" size={18} color="#94A3B8" />
          <Text style={styles.skipButtonText}>Omitir y usar medidas estándar</Text>
        </TouchableOpacity>
        
        {isSaving && (
          <ActivityIndicator size="small" color="#38BDF8" />
        )}
      </View>

      <VehicleCatalogModal
        visible={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onVehicleSaved={handleVehicleSavedFromCatalog}
      />
    </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    alignItems: 'center',
  },
  catalogBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  catalogBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },
  catalogBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  headerLogoThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 9,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#38BDF8',
    borderRadius: 4,
    marginRight: 10,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  stepContainer: {
    marginTop: 18,
  },
  questionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
    minHeight: 160,
  },
  optionsContainer: {
    maxHeight: 380,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  toggleTextActive: {
    color: '#0F172A',
  },
  inputWrapper: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
  },
  textInput: {
    height: 52,
    color: '#F8FAFC',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  skipButtonText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
