/**
 * CamperSites Pro - App principal
 * YRYS - Aplicación Profesional para Campers
 * 
 * Características:
 * - Interfaz moderna con efectos visuales profesionales
 * - Navegación intuitiva con curva de aprendizaje moderada
 * - Todas las categorías de áreas para autocaravanas
 * - Alertas de radares y controles en tiempo real
 * - Modo offline disponible
 * - Gráficos y animaciones fluidas
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
