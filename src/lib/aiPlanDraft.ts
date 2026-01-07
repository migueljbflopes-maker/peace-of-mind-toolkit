/**
 * AI Plan Draft Generator (Stub)
 * 
 * SECURITY:
 * - Only non-sensitive inputs are used
 * - No personal data is logged or sent to AI
 * - Generated content is calm and practical
 * 
 * TODO: Replace stub with actual AI API call when ready
 */

import { PlanData, PlanType } from './plansStore';

// Non-sensitive input for AI draft generation
export interface AIPlanInput {
  locale: 'en' | 'pt';
  region: string;
  riskLevelBand: 'low' | 'medium' | 'high';
  householdSizeBucket: '1' | '2-3' | '4+';
  hasPets: boolean;
  hasKids: boolean;
  mobilityLevel: 'low' | 'medium' | 'high';
  daysPreparedness: number;
}

// Deterministic content templates
const TEMPLATES = {
  en: {
    A: { // Shelter in place
      triggers: [
        'Severe weather warning issued for your area',
        'Power outage lasting more than 2 hours',
        'Local authorities advise staying indoors',
        'Unusual activity or unrest in the neighborhood',
        'Natural disaster alert (earthquake, flood risk)',
      ],
      objectives: [
        'Secure the home and all entry points',
        'Ensure water and food supply is accessible',
        'Charge all devices and prepare backup power',
        'Account for all household members',
        'Establish communication with family contacts',
      ],
      meetingPointPrimary: 'Living room or designated safe room',
      meetingPointSecondary: 'Kitchen near emergency supplies',
      stepsFirstHour: [
        'Check all doors and windows are secured',
        'Turn on radio or news for updates',
        'Gather family members in central location',
        'Locate flashlights and emergency kit',
        'Fill bathtub and containers with water',
      ],
      stepsFirstDay: [
        'Ration food and water if needed',
        'Check in with neighbors if safe',
        'Monitor local news for updates',
        'Keep devices charged, minimize usage',
        'Document any damage for insurance',
        'Rest in shifts if situation continues',
      ],
      grabList: [
        'Phone and charger',
        'Flashlight and batteries',
        'First aid kit',
        'Important documents folder',
        'Cash and cards',
        'Medications',
        'Water bottles',
        'Snacks and non-perishable food',
      ],
      mobilityNotes: 'Plan accessible routes within home',
    },
    B: { // Leave / Relocate
      triggers: [
        'Mandatory evacuation order issued',
        'Fire or flooding approaching your area',
        'Building structural damage detected',
        'Chemical or hazardous material spill nearby',
        'Prolonged utility failure with no restoration estimate',
      ],
      objectives: [
        'Evacuate safely and quickly',
        'Reach designated safe location',
        'Bring essential documents and supplies',
        'Account for all family members and pets',
        'Notify emergency contacts of your status',
      ],
      meetingPointPrimary: 'Front of building or main entrance',
      meetingPointSecondary: 'Neighbor\'s house or nearby landmark',
      stepsFirstHour: [
        'Grab pre-packed go-bag',
        'Secure home (turn off gas, lock doors)',
        'Load vehicle or prepare to leave on foot',
        'Confirm all family members are ready',
        'Text/call emergency contacts with plan',
      ],
      stepsFirstDay: [
        'Follow designated evacuation routes',
        'Stop at safe checkpoints if needed',
        'Conserve fuel and resources',
        'Check in with family hourly',
        'Register at evacuation center if applicable',
        'Document route and conditions',
      ],
      grabList: [
        'Go-bag with essentials',
        'Important documents (IDs, insurance)',
        'Cash and credit cards',
        'Phone, charger, power bank',
        'Medications for 7 days',
        'Water (1L per person)',
        'Non-perishable snacks',
        'Pet carrier and pet food (if applicable)',
        'Change of clothes',
        'Blanket or sleeping bag',
      ],
      mobilityNotes: 'Pre-plan accessible evacuation routes',
    },
  },
  pt: {
    A: { // Abrigo no local
      triggers: [
        'Aviso de tempo severo emitido para a sua área',
        'Falha de energia com duração superior a 2 horas',
        'Autoridades locais aconselham ficar em casa',
        'Atividade ou distúrbios invulgares no bairro',
        'Alerta de desastre natural (terramoto, risco de inundação)',
      ],
      objectives: [
        'Proteger a casa e todos os pontos de entrada',
        'Garantir que água e alimentos estão acessíveis',
        'Carregar todos os dispositivos e preparar energia de reserva',
        'Verificar presença de todos os membros da família',
        'Estabelecer comunicação com contactos familiares',
      ],
      meetingPointPrimary: 'Sala de estar ou divisão segura designada',
      meetingPointSecondary: 'Cozinha perto dos suprimentos de emergência',
      stepsFirstHour: [
        'Verificar se portas e janelas estão protegidas',
        'Ligar rádio ou notícias para atualizações',
        'Reunir membros da família em local central',
        'Localizar lanternas e kit de emergência',
        'Encher banheira e recipientes com água',
      ],
      stepsFirstDay: [
        'Racionar comida e água se necessário',
        'Verificar vizinhos se for seguro',
        'Monitorizar notícias locais para atualizações',
        'Manter dispositivos carregados, minimizar uso',
        'Documentar quaisquer danos para seguro',
        'Descansar por turnos se a situação continuar',
      ],
      grabList: [
        'Telemóvel e carregador',
        'Lanterna e pilhas',
        'Kit de primeiros socorros',
        'Pasta de documentos importantes',
        'Dinheiro e cartões',
        'Medicamentos',
        'Garrafas de água',
        'Snacks e alimentos não perecíveis',
      ],
      mobilityNotes: 'Planear rotas acessíveis dentro de casa',
    },
    B: { // Sair / Relocalizar
      triggers: [
        'Ordem de evacuação obrigatória emitida',
        'Incêndio ou inundação a aproximar-se da sua área',
        'Danos estruturais no edifício detetados',
        'Derrame químico ou de materiais perigosos próximo',
        'Falha prolongada de serviços sem previsão de restauro',
      ],
      objectives: [
        'Evacuar de forma segura e rápida',
        'Chegar ao local seguro designado',
        'Levar documentos e suprimentos essenciais',
        'Verificar todos os membros da família e animais',
        'Notificar contactos de emergência do seu estado',
      ],
      meetingPointPrimary: 'Frente do edifício ou entrada principal',
      meetingPointSecondary: 'Casa do vizinho ou ponto de referência próximo',
      stepsFirstHour: [
        'Pegar na mochila de emergência pré-preparada',
        'Proteger casa (fechar gás, trancar portas)',
        'Carregar veículo ou preparar para sair a pé',
        'Confirmar que todos estão prontos',
        'Enviar mensagem/ligar contactos de emergência',
      ],
      stepsFirstDay: [
        'Seguir rotas de evacuação designadas',
        'Parar em pontos de controlo seguros se necessário',
        'Conservar combustível e recursos',
        'Comunicar com família de hora a hora',
        'Registar-se no centro de evacuação se aplicável',
        'Documentar rota e condições',
      ],
      grabList: [
        'Mochila de emergência com essenciais',
        'Documentos importantes (IDs, seguros)',
        'Dinheiro e cartões de crédito',
        'Telemóvel, carregador, powerbank',
        'Medicamentos para 7 dias',
        'Água (1L por pessoa)',
        'Snacks não perecíveis',
        'Transportadora de animais e comida (se aplicável)',
        'Muda de roupa',
        'Cobertor ou saco-cama',
      ],
      mobilityNotes: 'Pré-planear rotas de evacuação acessíveis',
    },
  },
};

// Adjust content based on input
function adjustForInput(base: string[], input: AIPlanInput): string[] {
  const result = [...base];
  
  // Add pet-specific items
  if (input.hasPets && !result.some(item => item.toLowerCase().includes('pet'))) {
    if (input.locale === 'pt') {
      result.push('Preparar comida e água para animais de estimação');
    } else {
      result.push('Prepare food and water for pets');
    }
  }
  
  // Add kid-specific items
  if (input.hasKids && !result.some(item => item.toLowerCase().includes('kid') || item.toLowerCase().includes('child'))) {
    if (input.locale === 'pt') {
      result.push('Preparar itens essenciais para crianças (fraldas, snacks, brinquedo reconfortante)');
    } else {
      result.push('Prepare essentials for children (diapers, snacks, comfort item)');
    }
  }
  
  return result;
}

/**
 * Generate a plan draft based on non-sensitive inputs
 * 
 * TODO: Replace this stub with actual AI API call:
 * - Use OpenAI or Google AI Studio
 * - Send only non-sensitive inputs
 * - Parse structured response
 */
export async function generatePlanDraft(
  planType: PlanType,
  input: AIPlanInput
): Promise<PlanData> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const template = TEMPLATES[input.locale][planType];
  
  // TODO: Replace with AI API call
  // const response = await fetch('AI_ENDPOINT', {
  //   method: 'POST',
  //   body: JSON.stringify({ planType, input }),
  // });
  // const aiOutput = await response.json();
  
  const plan: PlanData = {
    meta: {
      planType,
      locale: input.locale,
      updatedAt: new Date().toISOString(),
    },
    triggers: [...template.triggers],
    objectives: [...template.objectives],
    meetingPoints: {
      primary: template.meetingPointPrimary,
      secondary: template.meetingPointSecondary,
    },
    contacts: {
      primary: '',
      secondary: '',
      outOfArea: '',
    },
    mobility: {
      constraints: input.mobilityLevel === 'low' 
        ? (input.locale === 'pt' ? 'Considerar necessidades de mobilidade especiais' : 'Consider special mobility needs')
        : '',
      transport: '',
      notes: template.mobilityNotes,
    },
    essentialsGrabList: adjustForInput(template.grabList, input),
    stepsFirstHour: adjustForInput(template.stepsFirstHour, input),
    stepsFirstDay: adjustForInput(template.stepsFirstDay, input),
    notes: '',
  };
  
  return plan;
}

/**
 * Create AI job input summary (non-sensitive only)
 */
export function createAIJobInputSummary(input: AIPlanInput): Record<string, unknown> {
  return {
    locale: input.locale,
    region: input.region,
    riskLevelBand: input.riskLevelBand,
    householdSizeBucket: input.householdSizeBucket,
    hasPets: input.hasPets,
    hasKids: input.hasKids,
    mobilityLevel: input.mobilityLevel,
    daysPreparedness: input.daysPreparedness,
    // NO sensitive data here
  };
}
