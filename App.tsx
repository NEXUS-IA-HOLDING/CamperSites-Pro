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

import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { UpdateService } from './src/services/UpdateService';
import { UpdateAvailableBanner } from './src/components/UpdateAvailableBanner';

function App(): React.JSX.Element {
  useEffect(() => {
    // Comprobar actualizaciones automáticas de versión tras iniciar la app
    const timer = setTimeout(() => {
      UpdateService.promptIfUpdateAvailable();
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <UpdateAvailableBanner autoOpenModalOnMandatory={true} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
