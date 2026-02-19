/**
 * AppNavigator - Navegacion principal con tabs + auth flow
 * CamperSites Pro - YRYS
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform, ActivityIndicator, View } from 'react-native';
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

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Mapa: { focused: 'map', unfocused: 'map-outline' },
  Explorar: { focused: 'compass', unfocused: 'compass-outline' },
  Favoritos: { focused: 'heart', unfocused: 'heart-outline' },
  Perfil: { focused: 'account-circle', unfocused: 'account-circle-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary.main,
        tabBarInactiveTintColor: theme.colors.text.hint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      })}>
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Explorar" component={ExploreScreen} />
      <Tab.Screen name="Favoritos" component={FavoritesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [showAuth, setShowAuth] = useState(true);

  useEffect(() => {
    // Comprobar si hay sesion activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setShowAuth(false);
      }
      setIsReady(true);
    });

    // Escuchar cambios de auth (login Y logout)
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
});
