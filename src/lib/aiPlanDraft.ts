/**
 * AI Plan Draft Generator
 * 
 * SECURITY:
 * - Only non-sensitive inputs are sent to AI
 * - OpenAI API key is server-side only (Edge Function)
 * - No personal data is logged or sent
 * - Generated content is calm and practical
 */

import { PlanData, PlanType } from './plansStore';
import { supabase } from '@/integrations/supabase/client';

// Non-sensitive input for AI draft generation
export interface AIPlanInput {
  locale: 'en' | 'pt';
  planType: PlanType;
  region: string;
  country?: string;
  riskLevelBand: 'low' | 'medium' | 'high';
  householdSizeBucket: '1' | '2-3' | '4+';
  hasPets: boolean;
  hasKids: boolean;
  mobilityLevel: 'low' | 'medium' | 'high';
  preparednessDays: number;
  constraints?: string[];
}

// AI output structure (matches edge function schema)
export interface AIPlanOutput {
  planType: 'A' | 'B';
  locale: 'en' | 'pt';
  title: string;
  summary: string;
  triggers: string[];
  objectives: string[];
  meetingPoints: {
    primary: string;
    secondary: string;
  };
  communications: {
    checkInRule: string;
    outOfAreaContactRole: string;
  };
  mobility: {
    constraints: string;
    transport: string;
    notes: string;
  };
  essentialsGrabList: string[];
  stepsFirstHour: string[];
  stepsFirstDay: string[];
  notes: string;
}

// Local fallback templates (used when AI fails)
const FALLBACK_TEMPLATES = {
  en: {
    A: {
      title: 'Shelter in Place Plan',
      summary: 'A practical plan for staying safe at home during emergencies.',
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
      meetingPoints: {
        primary: 'Living room or designated safe room',
        secondary: 'Kitchen near emergency supplies',
      },
      communications: {
        checkInRule: 'Check in with family every 2 hours via text',
        outOfAreaContactRole: 'Out-of-area contact receives status updates and relays info',
      },
      mobility: {
        constraints: '',
        transport: '',
        notes: 'Plan accessible routes within home',
      },
      essentialsGrabList: [
        'Phone and charger', 'Flashlight and batteries', 'First aid kit',
        'Important documents folder', 'Cash and cards', 'Medications',
        'Water bottles', 'Snacks and non-perishable food', 'Radio',
        'Blanket',
      ],
      stepsFirstHour: [
        'Check all doors and windows are secured',
        'Turn on radio or news for updates',
        'Gather family members in central location',
        'Locate flashlights and emergency kit',
        'Fill bathtub and containers with water',
        'Charge all devices',
      ],
      stepsFirstDay: [
        'Ration food and water if needed',
        'Check in with neighbors if safe',
        'Monitor local news for updates',
        'Keep devices charged, minimize usage',
        'Document any damage for insurance',
        'Rest in shifts if situation continues',
      ],
      notes: 'Always follow local authorities.',
    },
    B: {
      title: 'Evacuation Plan',
      summary: 'A clear plan for leaving your home safely when needed.',
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
      meetingPoints: {
        primary: 'Front of building or main entrance',
        secondary: 'Neighbor\'s house or nearby landmark',
      },
      communications: {
        checkInRule: 'Text family hourly during evacuation',
        outOfAreaContactRole: 'Out-of-area contact coordinates information sharing',
      },
      mobility: {
        constraints: '',
        transport: '',
        notes: 'Pre-plan accessible evacuation routes',
      },
      essentialsGrabList: [
        'Go-bag with essentials', 'Important documents (IDs, insurance)',
        'Cash and credit cards', 'Phone, charger, power bank',
        'Medications for 7 days', 'Water (1L per person)',
        'Non-perishable snacks', 'Pet carrier and pet food (if applicable)',
        'Change of clothes', 'Blanket or sleeping bag',
      ],
      stepsFirstHour: [
        'Grab pre-packed go-bag',
        'Secure home (turn off gas, lock doors)',
        'Load vehicle or prepare to leave on foot',
        'Confirm all family members are ready',
        'Text/call emergency contacts with plan',
        'Check traffic and route conditions',
      ],
      stepsFirstDay: [
        'Follow designated evacuation routes',
        'Stop at safe checkpoints if needed',
        'Conserve fuel and resources',
        'Check in with family hourly',
        'Register at evacuation center if applicable',
        'Document route and conditions',
      ],
      notes: 'Always follow local authorities.',
    },
  },
  pt: {
    A: {
      title: 'Plano de Abrigo no Local',
      summary: 'Um plano prático para ficar seguro em casa durante emergências.',
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
      meetingPoints: {
        primary: 'Sala de estar ou divisão segura designada',
        secondary: 'Cozinha perto dos suprimentos de emergência',
      },
      communications: {
        checkInRule: 'Comunicar com família a cada 2 horas por mensagem',
        outOfAreaContactRole: 'Contacto fora da área recebe atualizações e transmite informação',
      },
      mobility: {
        constraints: '',
        transport: '',
        notes: 'Planear rotas acessíveis dentro de casa',
      },
      essentialsGrabList: [
        'Telemóvel e carregador', 'Lanterna e pilhas', 'Kit de primeiros socorros',
        'Pasta de documentos importantes', 'Dinheiro e cartões', 'Medicamentos',
        'Garrafas de água', 'Snacks e alimentos não perecíveis', 'Rádio',
        'Cobertor',
      ],
      stepsFirstHour: [
        'Verificar se portas e janelas estão protegidas',
        'Ligar rádio ou notícias para atualizações',
        'Reunir membros da família em local central',
        'Localizar lanternas e kit de emergência',
        'Encher banheira e recipientes com água',
        'Carregar todos os dispositivos',
      ],
      stepsFirstDay: [
        'Racionar comida e água se necessário',
        'Verificar vizinhos se for seguro',
        'Monitorizar notícias locais para atualizações',
        'Manter dispositivos carregados, minimizar uso',
        'Documentar quaisquer danos para seguro',
        'Descansar por turnos se a situação continuar',
      ],
      notes: 'Siga sempre as instruções das autoridades locais.',
    },
    B: {
      title: 'Plano de Evacuação',
      summary: 'Um plano claro para sair de casa em segurança quando necessário.',
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
      meetingPoints: {
        primary: 'Frente do edifício ou entrada principal',
        secondary: 'Casa do vizinho ou ponto de referência próximo',
      },
      communications: {
        checkInRule: 'Enviar mensagem à família de hora a hora durante evacuação',
        outOfAreaContactRole: 'Contacto fora da área coordena partilha de informação',
      },
      mobility: {
        constraints: '',
        transport: '',
        notes: 'Pré-planear rotas de evacuação acessíveis',
      },
      essentialsGrabList: [
        'Mochila de emergência com essenciais', 'Documentos importantes (IDs, seguros)',
        'Dinheiro e cartões de crédito', 'Telemóvel, carregador, powerbank',
        'Medicamentos para 7 dias', 'Água (1L por pessoa)',
        'Snacks não perecíveis', 'Transportadora de animais e comida (se aplicável)',
        'Muda de roupa', 'Cobertor ou saco-cama',
      ],
      stepsFirstHour: [
        'Pegar na mochila de emergência pré-preparada',
        'Proteger casa (fechar gás, trancar portas)',
        'Carregar veículo ou preparar para sair a pé',
        'Confirmar que todos estão prontos',
        'Enviar mensagem/ligar contactos de emergência',
        'Verificar trânsito e condições da rota',
      ],
      stepsFirstDay: [
        'Seguir rotas de evacuação designadas',
        'Parar em pontos de controlo seguros se necessário',
        'Conservar combustível e recursos',
        'Comunicar com família de hora a hora',
        'Registar-se no centro de evacuação se aplicável',
        'Documentar rota e condições',
      ],
      notes: 'Siga sempre as instruções das autoridades locais.',
    },
  },
};

/**
 * Convert AI output to PlanData format
 */
function aiOutputToPlanData(output: AIPlanOutput): PlanData {
  return {
    meta: {
      planType: output.planType as PlanType,
      locale: output.locale,
      updatedAt: new Date().toISOString(),
    },
    triggers: output.triggers,
    objectives: output.objectives,
    meetingPoints: output.meetingPoints,
    contacts: {
      primary: '',
      secondary: '',
      outOfArea: '',
    },
    mobility: output.mobility,
    essentialsGrabList: output.essentialsGrabList,
    stepsFirstHour: output.stepsFirstHour,
    stepsFirstDay: output.stepsFirstDay,
    notes: output.notes,
  };
}

/**
 * Get fallback plan when AI fails
 */
function getFallbackPlan(planType: PlanType, input: AIPlanInput): PlanData {
  const template = FALLBACK_TEMPLATES[input.locale][planType];
  
  // Add pet/kid specific items if needed
  const grabList = [...template.essentialsGrabList];
  if (input.hasPets && !grabList.some(i => i.toLowerCase().includes('pet'))) {
    grabList.push(input.locale === 'pt' ? 'Comida e água para animais' : 'Pet food and water');
  }
  if (input.hasKids && !grabList.some(i => i.toLowerCase().includes('child'))) {
    grabList.push(input.locale === 'pt' ? 'Itens essenciais para crianças' : 'Essentials for children');
  }
  
  return {
    meta: {
      planType,
      locale: input.locale,
      updatedAt: new Date().toISOString(),
    },
    triggers: template.triggers,
    objectives: template.objectives,
    meetingPoints: template.meetingPoints,
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
      notes: template.mobility.notes,
    },
    essentialsGrabList: grabList,
    stepsFirstHour: template.stepsFirstHour,
    stepsFirstDay: template.stepsFirstDay,
    notes: template.notes,
  };
}

/**
 * Create AI job input summary (non-sensitive only)
 */
export function createAIJobInputSummary(input: AIPlanInput): Record<string, unknown> {
  return {
    locale: input.locale,
    planType: input.planType,
    region: input.region,
    country: input.country,
    riskLevelBand: input.riskLevelBand,
    householdSizeBucket: input.householdSizeBucket,
    hasPets: input.hasPets,
    hasKids: input.hasKids,
    mobilityLevel: input.mobilityLevel,
    preparednessDays: input.preparednessDays,
    constraints: input.constraints,
    // NO sensitive data here
  };
}

/**
 * Generate a plan draft using AI (via Edge Function)
 * Falls back to local template if AI fails
 */
export async function generatePlanDraft(
  planType: PlanType,
  input: AIPlanInput,
  userId: string
): Promise<{ plan: PlanData; usedAI: boolean }> {
  try {
    // 1. Create AI job in 'queued' status
    const inputSummary = createAIJobInputSummary({ ...input, planType });
    
    const { data: job, error: insertError } = await supabase
      .from('ai_jobs')
      .insert([{
        user_id: userId,
        job_type: `plan_${planType.toLowerCase()}_draft`,
        status: 'queued',
        input_summary: inputSummary as unknown as Record<string, never>,
      }])
      .select()
      .single();

    if (insertError || !job) {
      console.error('Failed to create AI job:', insertError);
      return { plan: getFallbackPlan(planType, input), usedAI: false };
    }

    console.log('Created AI job:', job.id);

    // 2. Call Edge Function to run the job
    const { data, error } = await supabase.functions.invoke('run-ai-job', {
      body: { job_id: job.id },
    });

    if (error) {
      console.error('Edge function error:', error);
      // Mark job as failed
      await supabase
        .from('ai_jobs')
        .update({ status: 'failed', error: error.message })
        .eq('id', job.id);
      return { plan: getFallbackPlan(planType, input), usedAI: false };
    }

    if (!data?.ok || !data?.output) {
      console.error('Invalid edge function response:', data);
      return { plan: getFallbackPlan(planType, input), usedAI: false };
    }

    // 3. Convert AI output to PlanData
    const planData = aiOutputToPlanData(data.output as AIPlanOutput);
    return { plan: planData, usedAI: true };

  } catch (error) {
    console.error('AI plan generation error:', error);
    return { plan: getFallbackPlan(planType, input), usedAI: false };
  }
}

/**
 * Legacy function for compatibility - now uses the new flow
 * @deprecated Use generatePlanDraft with userId instead
 */
export async function generatePlanDraftLegacy(
  planType: PlanType,
  input: Omit<AIPlanInput, 'planType'>
): Promise<PlanData> {
  const fullInput: AIPlanInput = { ...input, planType };
  return getFallbackPlan(planType, fullInput);
}
