/**
 * Servicio de Asistente de Perfilado con IA
 * Gestiona la conversación interactiva para recoger datos del vehículo y preferencias.
 * Trata los datos de forma privada y prepara el objeto para almacenamiento seguro.
 */

import { analyzePromptForInjection } from '../lib/AISecurityService';

export interface VehicleProfileData {
  vehicleType: 'camper' | 'motorhome' | 'caravan' | 'van' | 'truck' | 'delivery' | 'unknown';
  profileMode: 'camper' | 'truck' | 'delivery';
  height?: number; // metros
  width?: number;  // metros
  length?: number; // metros
  weight?: number; // kg
  axles?: number;  // 2, 3, 4+
  engineYear?: number;
  engineCC?: number;
  fuelType?: 'diesel' | 'diesel_plus' | 'gasolina' | 'glp' | 'gnc' | 'electrico' | 'hibrido';
  tankCapacity?: number; // L o kWh
  rangeKm?: number;      // km
  avgConsumption?: number;
  environmentalBadge?: '0' | 'ECO' | 'C' | 'B' | 'SIN_DISTINTIVO';
  tachographEnabled?: boolean;
  tachographLimitMinutes?: number;
  tachographAlertMinutes?: number;
  deliveryMode?: boolean;
  audioChannel?: 'multimedia' | 'bluetooth_hfp' | 'silent';
  radarAlertDistance?: 500 | 1000;
  controlAlertDistance?: 2000 | 5000 | 10000;
  drivingStyle: 'eco' | 'balanced' | 'fast' | 'scenic';
  avoidTolls: boolean;
  avoidHighways: boolean;
  maxSlopePreference: 'low' | 'medium' | 'high';
}

export interface ConversationStep {
  id: string;
  question: string;
  type: 'select' | 'number' | 'boolean' | 'text';
  options?: { label: string; value: any }[];
  field: keyof VehicleProfileData;
  validation?: (value: any) => boolean;
  skipIf?: (currentData: Partial<VehicleProfileData>) => boolean;
}

class ProfileAssistantService {
  private steps: ConversationStep[] = [
    {
      id: 'vehicle_type',
      question: "¡Hola! Soy tu copiloto IA. Para empezar, ¿qué tipo de vehículo conduces?",
      type: 'select',
      field: 'vehicleType',
      options: [
        { label: '🚐 Camper / Furgoneta', value: 'van' },
        { label: '🚌 Autocaravana', value: 'motorhome' },
        { label: '🚛 Camión / Rígido / Tráiler', value: 'truck' },
        { label: '🏠 Caravana', value: 'caravan' },
        { label: '🚙 Camper Van', value: 'camper' },
        { label: '❓ No estoy seguro / Otro', value: 'unknown' },
      ],
    },
    {
      id: 'height',
      question: "¿Cuál es la altura exacta de tu vehículo en metros? (Crucial para alertas de gálibo y puentes bajos).",
      type: 'number',
      field: 'height',
      validation: (val) => val > 1.2 && val <= 5.0,
      skipIf: (data) => data.vehicleType === 'unknown',
    },
    {
      id: 'width',
      question: "¿Y el ancho en metros? (Incluyendo retrovisores si procede).",
      type: 'number',
      field: 'width',
      validation: (val) => val > 1.4 && val <= 4.0,
      skipIf: (data) => data.vehicleType === 'unknown',
    },
    {
      id: 'fuel_type',
      question: "¿Qué tipo de carburante o propulsión utiliza tu vehículo?",
      type: 'select',
      field: 'fuelType',
      options: [
        { label: '⛽ Diésel Estándar', value: 'diesel' },
        { label: '🚀 Diésel Premium / Plus', value: 'diesel_plus' },
        { label: '⛽ Gasolina (95/98)', value: 'gasolina' },
        { label: '🔵 GLP / Autogás', value: 'glp' },
        { label: '💨 GNC (Gas Natural)', value: 'gnc' },
        { label: '⚡ 100% Eléctrico (EV)', value: 'electrico' },
        { label: '🔋 Híbrido (HEV / PHEV)', value: 'hibrido' },
      ],
    },
    {
      id: 'environmental_badge',
      question: "¿Qué distintivo ambiental tiene? (Para evitar sanciones en Zonas de Bajas Emisiones - ZBE)",
      type: 'select',
      field: 'environmentalBadge',
      options: [
        { label: '🔵 0 Emisiones (Azul)', value: '0' },
        { label: '🟢 ECO (Verde/Azul)', value: 'ECO' },
        { label: '🟡 Etiqueta C (Verde)', value: 'C' },
        { label: '🟠 Etiqueta B (Amarilla)', value: 'B' },
        { label: '❌ Sin Distintivo (Restringido)', value: 'SIN_DISTINTIVO' },
      ],
    },
    {
      id: 'range_km',
      question: "¿Cuál es tu autonomía aproximada (km con depósito o batería llena)?",
      type: 'number',
      field: 'rangeKm',
      validation: (val) => val >= 50 && val <= 3000,
    },
    {
      id: 'engine_year',
      question: "¿De qué año es el motor? (Para calcular pendientes máximas seguras).",
      type: 'number',
      field: 'engineYear',
      validation: (val) => val >= 1970 && val <= new Date().getFullYear() + 1,
    },
    {
      id: 'driving_style',
      question: "¿Qué estilo de conducción prefieres?",
      type: 'select',
      field: 'drivingStyle',
      options: [
        { label: '🌿 Eco (Ahorro máximo)', value: 'eco' },
        { label: '⚖️ Equilibrado', value: 'balanced' },
        { label: '🏎️ Rápido (Prioridad tiempo)', value: 'fast' },
        { label: '🏞️ Escénico (Rutas bonitas)', value: 'scenic' },
      ],
    },
    {
      id: 'avoid_tolls',
      question: "¿Quieres evitar peajes siempre que sea posible?",
      type: 'boolean',
      field: 'avoidTolls',
    },
    {
      id: 'slope_preference',
      question: "¿Te preocupan las cuestas pronunciadas? (Recomendado para motores antiguos o gran tonelaje)",
      type: 'select',
      field: 'maxSlopePreference',
      options: [
        { label: '🚫 Evitarlas totalmente (Motor antiguo/Sobrecarga)', value: 'low' },
        { label: '⚠️ Moderadas (Estándar)', value: 'medium' },
        { label: '💪 Sin problema (Potente)', value: 'high' },
      ],
    },
  ];

  getNextStep(
    currentStepIndex: number,
    currentData: Partial<VehicleProfileData>
  ): ConversationStep | null {
    if (currentStepIndex >= this.steps.length) return null;

    let nextIndex = currentStepIndex + 1;
    while (nextIndex < this.steps.length) {
      const step = this.steps[nextIndex];
      if (step.skipIf && step.skipIf(currentData)) {
        nextIndex++;
        continue;
      }
      return step;
    }
    return null;
  }

  getInitialStep(): ConversationStep {
    return this.steps[0];
  }

  validateInput(input: string): { valid: boolean; error?: string } {
    const analysis = analyzePromptForInjection(input);
    if (analysis.isMalicious) {
      return {
        valid: false,
        error: 'Entrada no permitida por razones de seguridad.',
      };
    }
    return { valid: true };
  }

  getTotalSteps(): number {
    return this.steps.length;
  }

  processAnswer(step: ConversationStep, value: any): Partial<VehicleProfileData> {
    let processedValue = value;

    if (step.field === 'vehicleType' && value === 'unknown') {
      return {
        vehicleType: 'unknown',
        height: 2.6,
        width: 2.1,
        maxSlopePreference: 'low',
        environmentalBadge: 'C',
        fuelType: 'diesel',
        rangeKm: 600,
        axles: 2,
      };
    }

    if (step.field === 'vehicleType' && value === 'truck') {
      return {
        vehicleType: 'truck',
        height: 3.8,
        width: 2.5,
        length: 12.0,
        weight: 18000,
        axles: 3,
        fuelType: 'diesel',
        profileMode: 'truck',
      };
    }

    return { [step.field]: processedValue } as Partial<VehicleProfileData>;
  }

  sanitizeProfileData(data: VehicleProfileData): VehicleProfileData {
    return {
      ...data,
    };
  }
}

export const profileAssistantService = new ProfileAssistantService();
