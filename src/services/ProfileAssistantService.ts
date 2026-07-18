/**
 * Servicio de Asistente de Perfilado con IA
 * Gestiona la conversación interactiva para recoger datos del vehículo y preferencias.
 * Trata los datos de forma privada y prepara el objeto para almacenamiento seguro.
 */

export interface VehicleProfileData {
  vehicleType: 'camper' | 'motorhome' | 'caravan' | 'van' | 'unknown';
  height?: number; // metros
  width?: number; // metros
  length?: number; // metros
  weight?: number; // kg
  engineYear?: number;
  engineCC?: number;
  drivingStyle: 'eco' | 'balanced' | 'fast' | 'scenic';
  avoidTolls: boolean;
  avoidHighways: boolean;
  maxSlopePreference: 'low' | 'medium' | 'high'; // Para motores antiguos
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
        { label: '🏠 Caravana', value: 'caravan' },
        { label: '🚙 Camper Van', value: 'camper' },
        { label: '❓ No estoy seguro / Otro', value: 'unknown' },
      ],
    },
    {
      id: 'height',
      question: "¿Cuál es la altura de tu vehículo? (Esto es crucial para evitar puentes bajos).",
      type: 'number',
      field: 'height',
      validation: (val) => val > 1.5 && val < 5.0,
      skipIf: (data) => data.vehicleType === 'unknown',
    },
    {
      id: 'width',
      question: "¿Y el ancho aproximado?",
      type: 'number',
      field: 'width',
      validation: (val) => val > 1.5 && val < 4.0,
      skipIf: (data) => data.vehicleType === 'unknown',
    },
    {
      id: 'engine_year',
      question: "¿De qué año es el motor? (Para calcular pendientes máximas seguras).",
      type: 'number',
      field: 'engineYear',
      validation: (val) => val >= 1980 && val <= new Date().getFullYear() + 1,
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
      question: "¿Te preocupan las cuestas pronunciadas? (Recomendado para motores antiguos)",
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

  getTotalSteps(): number {
    return this.steps.length;
  }

  processAnswer(step: ConversationStep, value: any): Partial<VehicleProfileData> {
    // Aquí podríamos añadir lógica de inferencia de IA en el futuro
    // Por ejemplo, si elige 'unknown', sugerir valores estándar seguros
    let processedValue = value;

    if (step.field === 'vehicleType' && value === 'unknown') {
      // Valores conservadores por defecto para seguridad
      return {
        vehicleType: 'unknown',
        height: 2.6, // Estándar seguro
        width: 2.1,
        maxSlopePreference: 'low',
      };
    }

    return { [step.field]: processedValue } as Partial<VehicleProfileData>;
  }

  sanitizeProfileData(data: VehicleProfileData): VehicleProfileData {
    // Limpieza y anonimización básica antes de guardar o enviar a APIs externas
    return {
      ...data,
      // Eliminar cualquier dato potencialmente identificable si fuera necesario en el futuro
      // Por ahora, mantenemos los datos técnicos necesarios para la ruta
    };
  }
}

export const profileAssistantService = new ProfileAssistantService();
