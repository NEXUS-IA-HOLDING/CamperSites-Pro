/**
 * AppNavigator - Navegación principal con tabs + auth flow
 * CamperSites Pro - YRYS
 * Diseño moderno, intuitivo y profesional
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../lib/supabase';

import AuthScreen from '../screens/AuthScreen';
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
        animationEnabled: true,
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

export default function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [showAuth, setShowAuth] = useState(true);

  useEffect(() => {
    // Comprobar si hay sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setShowAuth(false);
      }
      setIsReady(true);
    });

    // Escuchar cambios de auth (login y logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setShowAuth(!session);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={styles.loadingText}>Cargando CamperSites Pro...</Text>
      </View>
    );
  }

  if (showAuth) {
    return <AuthScreen onAuthSuccess={() => setShowAuth(false)} />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 10,
    },
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    transform: [{ scale: 1.1 }],
  },
  iconUnfocused: {
    opacity: 0.7,
  },
});
