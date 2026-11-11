/**
 * AppNavigator - Navegación principal con tabs + auth flow
 * CamperSites Pro - YRYS
 * Diseño moderno, intuitivo y profesional
 * 
 * Flujo de usuario:
 * 1. Auth (Login/Registro) -> 2. Selección de Plan -> 3. Perfil de Vehículo (opcional) -> 4. App Principal
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, ActivityIndicator, View, Text, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

import AuthScreen from '../screens/AuthScreen';
import PlanSelectionScreen from '../screens/PlanSelectionScreen';
import VehicleProfileScreen from '../screens/VehicleProfileScreen';
import MapScreen from '../screens/MapScreen';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ConfigScreen from '../screens/ConfigScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { CamperSitesTheme as theme } from '../theme';

const Tab = createBottomTabNavigator();

// Iconos dinámicos con animación visual
const TAB_ICONS: Record<string, { focused: string; unfocused: string; label: string }> = {
  Mapa: { focused: 'map', unfocused: 'map-outline', label: 'Mapa' },
  Explorar: { focused: 'compass', unfocused: 'compass-outline', label: 'Explorar' },
  Favoritos: { focused: 'heart', unfocused: 'heart-outline', label: 'Favoritos' },
  Config: { focused: 'cog', unfocused: 'cog-outline', label: 'Config' },
  Perfil: { focused: 'account-circle', unfocused: 'account-circle-outline', label: 'Perfil' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      id="main-tabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return (
            <View style={styles.iconContainer}>
              <Icon 
                name={iconName} 
                size={size} 
                color={color} 
                style={focused ? styles.iconFocused : styles.iconUnfocused}
              />
            </View>
          );
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
        lazy: true,
      })}>
      <Tab.Screen 
        name="Mapa" 
        component={MapScreen}
        options={{ tabBarBadge: undefined }}
      />
      <Tab.Screen 
        name="Explorar" 
        component={ExploreScreen}
      />
      <Tab.Screen 
        name="Favoritos" 
        component={FavoritesScreen}
      />
      <Tab.Screen 
        name="Config" 
        component={ConfigScreen}
      />
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

type OnboardingStep = 'auth' | 'plan' | 'vehicle' | 'complete';

export default function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('auth');
  const [hasVehicleProfile, setHasVehicleProfile] = useState(false);

  useEffect(() => {
    checkOnboardingState();
  }, []);

  const checkOnboardingState = async () => {
    try {
      // 1. Verificación offline-first: Si ya se inició sesión, completó onboarding o existe perfil/vehículo, ir directo a la app principal
      const [
        sessionActive,
        onboarded,
        profileCompleted,
        vehicleConfig,
        userVehicleSetup,
        selectedVehicleId,
        legacySetup,
      ] = await Promise.all([
        AsyncStorage.getItem('@camper_session_active'),
        AsyncStorage.getItem('@camper_onboarding_completed'),
        AsyncStorage.getItem('@camper_profile_completed'),
        AsyncStorage.getItem('@camper_vehicle_config'),
        AsyncStorage.getItem('@camper_user_vehicle_setup'),
        AsyncStorage.getItem('@camper_selected_vehicle_id'),
        AsyncStorage.getItem('@camper_vehicle_setup'),
      ]);

      if (
        sessionActive === 'true' ||
        onboarded === 'true' ||
        profileCompleted === 'true' ||
        vehicleConfig ||
        userVehicleSetup ||
        selectedVehicleId ||
        legacySetup
      ) {
        await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
        setCurrentStep('complete');
        setIsReady(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCurrentStep('auth');
        setIsReady(true);
        return;
      }

      // Verificar si ya seleccionó plan
      const user = session.user;
      const userPlan = user.user_metadata?.plan;
      const localPlan = await AsyncStorage.getItem('@camper_user_plan');
      
      if (!userPlan && !localPlan) {
        setCurrentStep('plan');
        setIsReady(true);
        return;
      }

      // Verificar si tiene perfil de vehículo en Supabase
      const { data: vehicleProfile } = await supabase
        .from('vehicle_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vehicleProfile) {
        setCurrentStep('vehicle');
        setIsReady(true);
        return;
      }

      // Onboarding completo
      await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
      setCurrentStep('complete');
      setIsReady(true);
    } catch (error) {
      console.error('Error checking onboarding state:', error);
      // Seguridad: en caso de fallo o timeout de red, no atrapar al usuario en bucle
      setCurrentStep('complete');
      setIsReady(true);
    }
  };

  const handleAuthSuccess = async () => {
    const vehicleConfig = await AsyncStorage.getItem('@camper_vehicle_config');
    if (vehicleConfig) {
      await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
      setCurrentStep('complete');
    } else {
      setCurrentStep('plan');
    }
  };

  const handlePlanComplete = async () => {
    await AsyncStorage.setItem('@camper_user_plan', 'pro');
    const vehicleConfig = await AsyncStorage.getItem('@camper_vehicle_config');
    if (vehicleConfig) {
      await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
      setCurrentStep('complete');
    } else {
      setCurrentStep('vehicle');
    }
  };

  const handlePlanSkip = async () => {
    await AsyncStorage.setItem('@camper_user_plan', 'free');
    const vehicleConfig = await AsyncStorage.getItem('@camper_vehicle_config');
    if (vehicleConfig) {
      await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
      setCurrentStep('complete');
    } else {
      setCurrentStep('vehicle');
    }
  };

  const handleVehicleComplete = async () => {
    await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
    await AsyncStorage.setItem('@camper_profile_completed', 'true');
    setCurrentStep('complete');
  };

  const handleVehicleSkip = async () => {
    await AsyncStorage.setItem('@camper_onboarding_completed', 'true');
    await AsyncStorage.setItem('@camper_profile_completed', 'true');
    setCurrentStep('complete');
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogoBox}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.loadingAppName}>CamperSites Pro</Text>
        <Text style={styles.loadingSub}>Iniciando cabina de navegación...</Text>
        <ActivityIndicator size="small" color="#38BDF8" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // Renderizar pantalla según el paso del onboarding
  switch (currentStep) {
    case 'auth':
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
    
    case 'plan':
      return (
        <PlanSelectionScreen 
          onComplete={handlePlanComplete}
          onSkip={handlePlanSkip}
        />
      );
    
    case 'vehicle':
      return (
        <VehicleProfileScreen 
          onComplete={handleVehicleComplete}
          onSkip={handleVehicleSkip}
        />
      );
    
    case 'complete':
      return (
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      );
    
    default:
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingLogoBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  loadingAppName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  loadingSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopWidth: 1.5,
    height: Platform.OS === 'ios' ? 70 : 66,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 20,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    transform: [{ scale: 1.15 }],
  },
  iconUnfocused: {
    opacity: 0.65,
  },
});
