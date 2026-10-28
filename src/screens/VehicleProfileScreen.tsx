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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CamperSitesTheme as theme } from '../theme';
import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../lib/security';
import { Logger } from '../utils/logger';
import { profileAssistantService, VehicleProfileData, ConversationStep } from '../services/ProfileAssistantService';

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

    // Validar input si es necesario
    if (currentStep.type === 'number' || currentStep.type === 'text') {
      if (!inputValue.trim()) {
        Alert.alert('Campo requerido', 'Por favor, responde a la pregunta para continuar.');
        return;
      }

      // Validación de seguridad IA contra inyección de prompt
      const securityCheck = profileAssistantService.validateInput(inputValue);
      if (!securityCheck.valid) {
        Alert.alert('Seguridad', securityCheck.error || 'Entrada no permitida.');
        return;
      }

      const numValue = currentStep.type === 'number' ? parseFloat(inputValue) : inputValue;
      
      if (currentStep.validation && !currentStep.validation(numValue)) {
        Alert.alert('Valor inválido', 'El valor introducido no es correcto. Por favor, inténtalo de nuevo.');
        return;
      }

      const processedData = profileAssistantService.processAnswer(currentStep, numValue);
      setProfileData(prev => ({ ...prev, ...processedData }));
    } else if (currentStep.type === 'boolean') {
      // Para booleanos, alternamos el valor actual
      const currentValue = profileData[currentStep.field] as boolean || false;
      const processedData = profileAssistantService.processAnswer(currentStep, !currentValue);
      setProfileData(prev => ({ ...prev, ...processedData }));
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Datos por defecto para campos opcionales no completados
      const completeProfile: VehicleProfileData = {
        vehicleType: profileData.vehicleType || 'unknown',
        profileMode: profileData.profileMode || (profileData.vehicleType === 'truck' ? 'truck' : profileData.vehicleType === 'delivery' ? 'delivery' : 'camper'),
        height: profileData.height || 2.6,
        width: profileData.width || 2.1,
        length: profileData.length || 6.0,
        weight: profileData.weight || 3500,
        axles: profileData.axles || 2,
        fuelType: profileData.fuelType || 'diesel',
        rangeKm: profileData.rangeKm || 650,
        tankCapacity: profileData.tankCapacity || 80,
        avgConsumption: profileData.avgConsumption || 9.5,
        environmentalBadge: profileData.environmentalBadge || 'C',
        engineYear: profileData.engineYear || 2010,
        engineCC: profileData.engineCC || 2000,
        drivingStyle: profileData.drivingStyle || 'balanced',
        avoidTolls: profileData.avoidTolls || false,
        avoidHighways: profileData.avoidHighways || false,
        maxSlopePreference: profileData.maxSlopePreference || 'medium',
      };

      const sanitizedData = profileAssistantService.sanitizeProfileData(completeProfile);

      // Guardar también en almacenamiento local para navegación inmediata y offline
      try {
        await AsyncStorage.setItem('@camper_vehicle_config', JSON.stringify({
          type: sanitizedData.vehicleType,
          height: sanitizedData.height?.toString() || '2.6',
          width: sanitizedData.width?.toString() || '2.1',
          length: sanitizedData.length?.toString() || '6.0',
          weight: sanitizedData.weight?.toString() || '3500',
          axles: sanitizedData.axles?.toString() || '2',
          fuelType: sanitizedData.fuelType || 'diesel',
          rangeKm: sanitizedData.rangeKm?.toString() || '650',
          environmentalBadge: sanitizedData.environmentalBadge || 'C',
          name: sanitizedData.vehicleType === 'truck' ? 'Mi Camión Pesado' : 'Mi Vehículo',
        }));
      } catch (e) {}

      // Insertar o actualizar perfil en Supabase
      const { error } = await supabase
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

      if (error) throw error;

      Logger.info('VehicleProfile', 'Perfil de vehículo guardado exitosamente');
      
      Alert.alert(
        '¡Perfil Completado!',
        'Tu vehículo ha sido configurado. Ahora tu asistente IA optimizará tus rutas.',
        [
          {
            text: 'Empezar a usar',
            onPress: onComplete,
          },
        ]
      );
    } catch (error: any) {
      Logger.error('Error guardando perfil', error);
      Alert.alert('Error', 'No se pudo guardar el perfil. Inténtalo más tarde.');
    } finally {
      setIsSaving(false);
    }
  };

  const skipProfile = () => {
    Alert.alert(
      'Omitir configuración',
      '¿Estás seguro? Podrás configurar tu vehículo más tarde en Ajustes. Las rutas no estarán optimizadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Omitir',
          style: 'default',
          onPress: onSkip,
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
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              <Icon name="chevron-right" size={24} color={theme.colors.primary.main} />
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
            activeOpacity={0.7}
          >
            <Icon name={currentValue ? 'circle-outline' : 'check-circle'} size={24} color={!currentValue ? '#FFFFFF' : theme.colors.gray} />
            <Text style={[styles.toggleText, !currentValue && styles.toggleTextActive]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, currentValue && styles.toggleButtonActive]}
            onPress={() => handleOptionSelect(true)}
            activeOpacity={0.7}
          >
            <Icon name={currentValue ? 'check-circle' : 'circle-outline'} size={24} color={currentValue ? '#FFFFFF' : theme.colors.gray} />
            <Text style={[styles.toggleText, currentValue && styles.toggleTextActive]}>Sí</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TextInput
        style={styles.textInput}
        placeholder="Escribe tu respuesta..."
        placeholderTextColor={theme.colors.text.hint}
        value={inputValue}
        onChangeText={setInputValue}
        keyboardType={currentStep.type === 'number' ? 'decimal-pad' : 'default'}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleContinue}
      />
    );
  };

  const progress = currentStepIndex >= 0 
    ? ((currentStepIndex + 1) / profileAssistantService.getTotalSteps()) * 100 
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={styles.loadingText}>Preparando asistente...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="robot-happy" size={48} color={theme.colors.primary.main} />
        </View>
        <Text style={styles.title}>🤖 Asistente de Configuración</Text>
        <Text style={styles.subtitle}>Te haré unas preguntas rápidas para conocer tu vehículo y preferencias</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {currentStep && (
          <View style={styles.stepContainer}>
            <View style={styles.questionBubble}>
              <Icon name="message-text-outline" size={24} color={theme.colors.primary.main} />
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
          <Icon name="skip-forward" size={20} color={theme.colors.text.hint} />
          <Text style={styles.skipButtonText}>Omitir por ahora</Text>
        </TouchableOpacity>
        
        {isSaving && (
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.main,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 50 : 24,
    alignItems: 'center',
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
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    backgroundColor: theme.colors.background.light,
    marginHorizontal: 24,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.primary.main,
    borderRadius: 4,
    marginRight: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary.main,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  stepContainer: {
    marginTop: 24,
  },
  questionBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
    gap: 12,
  },
  question: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    lineHeight: 28,
  },
  inputContainer: {
    marginBottom: 24,
    minHeight: 200,
  },
  optionsContainer: {
    maxHeight: 400,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
    gap: 10,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  toggleTextActive: {
    color: theme.colors.white,
  },
  textInput: {
    backgroundColor: theme.colors.white,
    padding: 20,
    borderRadius: 14,
    fontSize: 17,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  continueButton: {
    backgroundColor: theme.colors.primary.main,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: theme.colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background.main,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  skipButtonText: {
    color: theme.colors.text.hint,
    fontSize: 15,
    fontWeight: '500',
  },
});
