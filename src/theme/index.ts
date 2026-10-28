/**
 * FASE 3: DISEÑO DISTINTIVO ÚNICO
 * Sistema de diseño profesional para CamperSites
 */

export const CamperSitesTheme = {
  // ⭐ COLORES PRINCIPALES - Naturaleza + Aventura
  colors: {
    primary: {
      main: '#2E7D32',      // Verde bosque profundo
      light: '#66BB6A',     // Verde claro
      dark: '#1B5E20',      // Verde oscuro
      contrast: '#FFFFFF',  // Blanco
    },
    secondary: {
      main: '#FF6F00',      // Naranja atardecer
      light: '#FFA726',     // Naranja claro
      dark: '#E65100',      // Naranja oscuro
      contrast: '#FFFFFF',
    },
    accent: {
      sky: '#1976D2',       // Azul cielo
      ocean: '#0277BD',     // Azul océano
      sunset: '#F57C00',    // Naranja sunset
      mountain: '#5D4037',  // Marrón montaña
      gold: '#FFB300',      // Oro / Estrella Premium
    },
    white: '#FFFFFF',
    black: '#000000',
    gray: '#9E9E9E',
    border: {
      main: '#E0E0E0',
      light: '#F0F0F0',
      dark: '#BDBDBD',
    },
    success: {
      main: '#388E3C',
      light: '#4CAF50',
      dark: '#2E7D32',
    },
    alerts: {
      radar: '#D32F2F',     // Rojo radar
      control: '#FF6F00',   // Naranja control
      success: '#388E3C',   // Verde éxito
      warning: '#F57C00',   // Naranja warning
      info: '#1976D2',      // Azul info
    },
    background: {
      light: '#F5F5F5',     // Gris muy claro
      main: '#FFFFFF',      // Blanco
      dark: '#1C1C1C',      // Negro casi
      paper: '#FAFAFA',     // Papel
    },
    text: {
      primary: '#212121',   // Negro texto
      secondary: '#757575', // Gris texto
      disabled: '#BDBDBD',  // Gris deshabilitado
      hint: '#9E9E9E',      // Gris hint
    },
    // Glassmorphism & Modern UI
    glass: {
      light: 'rgba(255, 255, 255, 0.88)',
      dark: 'rgba(15, 23, 42, 0.88)',
      borderLight: 'rgba(255, 255, 255, 0.65)',
      borderDark: 'rgba(255, 255, 255, 0.15)',
      cardBg: 'rgba(255, 255, 255, 0.92)',
    },
    // HUD Conducción Futurista
    hud: {
      tacticalBg: '#0F172A',
      speedNormal: '#10B981',   // Verde esmeralda digital
      speedWarning: '#F59E0B',  // Ámbar alerta
      speedOver: '#EF4444',     // Rojo exceso
      cyanNeon: '#06B6D4',      // Neón cian
      tachoWarning: '#F97316',  // Naranja tacógrafo
      clearanceDanger: '#DC2626', // Rojo gálibo
    },
  },

  // ⭐ TIPOGRAFÍA - Roboto + Montserrat
  typography: {
    fontFamily: {
      primary: 'Roboto',        // Textos
      heading: 'Montserrat',    // Títulos
      mono: 'RobotoMono',       // Código/Números
    },
    fontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // ⭐ ESPACIADO - Sistema 8px
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // ⭐ BORDES Y SOMBRAS
  borders: {
    radius: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      full: 9999,
    },
    width: {
      thin: 1,
      medium: 2,
      thick: 4,
    },
  },

  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      elevation: 12,
    },
  },

  // ⭐ ANIMACIONES
  animations: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear',
    },
  },

  // ⭐ COMPONENTES ESPECÍFICOS
  components: {
    button: {
      primary: {
        backgroundColor: '#2E7D32',
        color: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        fontSize: 16,
        fontWeight: '600',
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#2E7D32',
        borderColor: '#2E7D32',
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        fontSize: 16,
        fontWeight: '600',
      },
      alert: {
        backgroundColor: '#D32F2F',
        color: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        fontSize: 16,
        fontWeight: '700',
      },
    },
    card: {
      default: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      elevated: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      },
    },
    input: {
      default: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#212121',
        borderWidth: 1,
        borderColor: 'transparent',
      },
      focused: {
        borderColor: '#2E7D32',
        backgroundColor: '#FFFFFF',
      },
      error: {
        borderColor: '#D32F2F',
      },
    },
    badge: {
      success: {
        backgroundColor: '#E8F5E9',
        color: '#2E7D32',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        fontSize: 12,
        fontWeight: '600',
      },
      warning: {
        backgroundColor: '#FFF3E0',
        color: '#E65100',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        fontSize: 12,
        fontWeight: '600',
      },
      error: {
        backgroundColor: '#FFEBEE',
        color: '#C62828',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        fontSize: 12,
        fontWeight: '600',
      },
    },
  },

  // ⭐ ICONOS PERSONALIZADOS
  icons: {
    sizes: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 48,
    },
    colors: {
      camping: '#2E7D32',
      parking: '#1976D2',
      radar: '#D32F2F',
      control: '#FF6F00',
      service: '#757575',
    },
  },
};

// ⭐ UTILIDADES DE ESTILO
export const createStyles = (theme = CamperSitesTheme) => ({
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  
  // Flexbox helpers
  row: {
    flexDirection: 'row' as const,
  },
  rowCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  // Texto
  textPrimary: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.primary,
  },
  textSecondary: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  heading1: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
  },
  heading2: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
  },
  heading3: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.medium,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
  },

  // Sombras
  shadowSm: theme.shadows.sm,
  shadowMd: theme.shadows.md,
  shadowLg: theme.shadows.lg,
  shadowXl: theme.shadows.xl,

  // Espaciado
  p1: { padding: theme.spacing.xs },
  p2: { padding: theme.spacing.sm },
  p3: { padding: theme.spacing.md },
  p4: { padding: theme.spacing.lg },
  
  m1: { margin: theme.spacing.xs },
  m2: { margin: theme.spacing.sm },
  m3: { margin: theme.spacing.md },
  m4: { margin: theme.spacing.lg },

  // Bordes
  rounded: { borderRadius: theme.borders.radius.md },
  roundedLg: { borderRadius: theme.borders.radius.lg },
  roundedFull: { borderRadius: theme.borders.radius.full },
});

export default CamperSitesTheme;
