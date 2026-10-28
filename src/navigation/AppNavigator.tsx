/**
 * AppNavigator - Navegación principal con tabs + auth flow
 * CamperSites Pro - YRYS
 * Diseño moderno, intuitivo y profesional
 * 
 * Flujo de usuario:
 * 1. Auth (Login/Registro) -> 2. Selección de Plan -> 3. Perfil de Vehículo (opcional) -> 4. App Principal
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';

import AuthScreen from '../screens/AuthScreen';
import PlanSelectionScreen from '../screens/PlanSelectionScreen';
import VehicleProfileScreen from '../screens/VehicleProfileScreen';
import MapScreen from '../screens/MapScreen';
import ExploreScreen from '../screens/ExploreScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { CamperSitesTheme as theme } from '../theme';

const Tab = createBottomTabNavigator();

// Iconos dinámicos con animación visual
const TAB_ICONS: Record<string, { focused: string; unfocused: string; label: string }> = {
  Mapa: { focused: 'map', unfocused: 'map-outline', label: 'Mapa' },
  Explorar: { focused: 'compass', unfocused: 'compass-outline', label: 'Explorar' },
  Favoritos: { focused: 'heart', unfocused: 'heart-outline', label: 'Favoritos' },
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
        tabBarActiveTintColor: theme.colors.primary.main,
        tabBarInactiveTintColor: theme.colors.text.hint,
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCurrentStep('auth');
        setIsReady(true);
        return;
      }

      // Verificar si ya seleccionó plan
      const user = session.user;
      const userPlan = user.user_metadata?.plan;
      
      if (!userPlan) {
        setCurrentStep('plan');
        setIsReady(true);
        return;
      }

      // Verificar si tiene perfil de vehículo
      const { data: vehicleProfile } = await supabase
        .from('vehicle_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vehicleProfile) {
        setCurrentStep('vehicle');
        setIsReady(true);
        return;
      }

      // Onboarding completo
      setCurrentStep('complete');
      setIsReady(true);
    } catch (error) {
      console.error('Error checking onboarding state:', error);
      setCurrentStep('auth');
      setIsReady(true);
    }
  };

  const handleAuthSuccess = () => {
    setCurrentStep('plan');
  };

  const handlePlanComplete = () => {
    setCurrentStep('vehicle');
  };

  const handlePlanSkip = () => {
    setCurrentStep('vehicle');
  };

  const handleVehicleComplete = () => {
    setCurrentStep('complete');
  };

  const handleVehicleSkip = () => {
    setCurrentStep('complete');
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={styles.loadingText}>Cargando CamperSites Pro...</Text>
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
    backgroundColor: theme.colors.background.main,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.main,
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1.5,
    height: Platform.OS === 'ios' ? 68 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 16,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
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
