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

// Rich non-sensitive input for AI draft generation
export interface AIPlanInput {
  locale: 'en' | 'pt';
  planType: PlanType;
  
  // Location context (no exact addresses)
  location?: {
    country?: string;
    city?: string;
    postalCode?: string;
    dwellingType?: 'apartment' | 'house';
    floorLevel?: 'ground' | '1-3' | '4+';
    hasElevator?: boolean;
    hasGarden?: boolean;
  };
  
  // Household composition
  household?: {
    adults?: number;
    kids?: number;
    pets?: number;
    petTypes?: string[];
    mobilityConstraints?: string[];
    primaryLanguage?: string;
  };
  
  // Home reality signals
  homeReality?: {
    internetReliance?: 'low' | 'medium' | 'high';
    powerOutagePreparedness?: 'low' | 'medium' | 'high';
    waterStorage?: 'none' | 'some' | 'good';
    cookingOptions?: string[];
    heatingType?: 'district' | 'gas' | 'electric' | 'none';
    vehicleAccess?: 'none' | 'car' | 'bike_only' | 'multiple';
    cashOnHandLevel?: 'none' | 'some' | 'good';
  };
  
  // Risk context from calculator
  riskContext?: {
    riskLevelBand?: 'low' | 'medium' | 'high';
    topDrivers?: string[];
    notes?: string;
  };
  
  // Supplies context
  suppliesContext?: {
    preparednessDaysEstimate?: number;
    gapsTop3?: string[];
  };
  
  // User preferences
  preferences?: {
    calmTone?: boolean;
    avoidFearLanguage?: boolean;
    mobilityPlanPreference?: 'stay_first' | 'leave_first' | 'balanced';
  };

  // Legacy fields for backwards compatibility
  region?: string;
  country?: string;
  riskLevelBand?: 'low' | 'medium' | 'high';
  householdSizeBucket?: '1' | '2-3' | '4+';
  hasPets?: boolean;
  hasKids?: boolean;
  mobilityLevel?: 'low' | 'medium' | 'high';
  preparednessDays?: number;
  constraints?: string[];
}

// Rich AI output structure (matches new schema)
export interface AIPlanOutput {
  planType: 'A' | 'B';
  locale: 'en' | 'pt';
  title: string;
  whyThisFitsYou: string;
  topPrioritiesThisWeek: string[];
  triggers: string[];
  objectives: string[];
  homeSetup: {
    power: string[];
    water: string[];
    cooking: string[];
    communicationsBackup: string[];
    documentsHandling: string[];
  };
  communications: {
    checkInRule: string;
    outOfAreaContactRole: string;
    familyMeetingRule: string;
  };
  mobility: {
    constraints: string;
    transport: string;
    meetingPoints: {
      primary: string;
      secondary: string;
    };
    routeNotes: string[];
  };
  pets: {
    hasPets: boolean;
    petCareChecklist: string[];
  };
  essentialsGrabList: string[];
  stepsFirstHour: string[];
  stepsFirstDay: string[];
  checklists: {
    beforeDisruption: string[];
    duringDisruption: string[];
    afterDisruption: string[];
  };
  notes: string;
}

// Local fallback templates (used when AI fails)
const FALLBACK_TEMPLATES = {
  en: {
    A: {
      title: 'Shelter in Place Plan',
      whyThisFitsYou: 'This plan is designed for your household to stay safe at home during disruptions.',
      topPrioritiesThisWeek: [
        'Check water storage and fill containers',
        'Test flashlights and stock batteries',
        'Locate important documents',
        'Share this plan with family members',
        'Create a simple emergency contact list',
      ],
      triggers: [
        'Severe weather warning issued for your area',
        'Power outage lasting more than 2 hours',
        'Local authorities advise staying indoors',
        'Unusual activity or unrest in the neighborhood',
        'Natural disaster alert (earthquake, flood risk)',
        'Public health advisory recommending isolation',
      ],
      objectives: [
        'Secure the home and all entry points',
        'Ensure water and food supply is accessible',
        'Charge all devices and prepare backup power',
        'Account for all household members',
        'Establish communication with family contacts',
        'Monitor official news channels for updates',
      ],
      homeSetup: {
        power: [
          'Locate flashlights and batteries in accessible spots',
          'Charge power banks and devices',
          'Know location of circuit breaker',
          'Consider candles/lanterns as backup',
        ],
        water: [
          'Fill bathtub and large containers when alert is issued',
          'Store 3L per person per day',
          'Know how to turn off main water valve',
          'Keep water purification tablets handy',
        ],
        cooking: [
          'Stock non-perishable foods that need no cooking',
          'If available, have camping stove as backup',
          'Know how to safely use alternative cooking',
        ],
        communicationsBackup: [
          'Have battery-powered or hand-crank radio',
          'Keep phone chargers in multiple rooms',
          'Write down key phone numbers on paper',
        ],
        documentsHandling: [
          'Store copies in waterproof bag',
          'Know location of originals',
          'Consider digital backup in secure cloud',
        ],
      },
      communications: {
        checkInRule: 'Check in with family every 2 hours via text',
        outOfAreaContactRole: 'Out-of-area contact receives status updates and relays info',
        familyMeetingRule: 'Meet in living room every 4 hours to discuss situation',
      },
      mobility: {
        constraints: '',
        transport: '',
        meetingPoints: {
          primary: 'Living room or designated safe room',
          secondary: 'Kitchen near emergency supplies',
        },
        routeNotes: [
          'Identify safest room away from windows',
          'Plan accessible routes within home',
          'Know multiple exits from each room',
        ],
      },
      pets: {
        hasPets: false,
        petCareChecklist: [
          'Keep pet food and water for 7 days',
          'Have pet carrier accessible',
          'Store pet medications',
        ],
      },
      essentialsGrabList: [
        'Phone and charger', 'Flashlight and batteries', 'First aid kit',
        'Important documents folder', 'Cash and cards', 'Medications',
        'Water bottles', 'Snacks and non-perishable food', 'Radio',
        'Blanket', 'Whistle for signaling', 'Multi-tool or knife',
      ],
      stepsFirstHour: [
        'Check all doors and windows are secured',
        'Turn on radio or news for updates',
        'Gather family members in central location',
        'Locate flashlights and emergency kit',
        'Fill bathtub and containers with water',
        'Charge all devices',
        'Account for all household members',
        'Brief everyone on the plan',
      ],
      stepsFirstDay: [
        'Ration food and water if needed',
        'Check in with neighbors if safe',
        'Monitor local news for updates',
        'Keep devices charged, minimize usage',
        'Document any damage for insurance',
        'Rest in shifts if situation continues',
        'Check on vulnerable neighbors if safe',
        'Reassess situation every few hours',
      ],
      checklists: {
        beforeDisruption: [
          'Emergency kit stocked and accessible',
          'Phone and devices charged',
          'Important contacts saved offline',
          'Water storage filled',
          'First aid kit checked',
          'Flashlights and batteries ready',
        ],
        duringDisruption: [
          'Stay informed via radio',
          'Conserve resources',
          'Stay indoors unless directed otherwise',
          'Check in with family regularly',
          'Document damage if safe',
          'Avoid unnecessary travel',
        ],
        afterDisruption: [
          'Check for structural damage before moving around',
          'Restock emergency supplies',
          'File insurance claims if needed',
          'Reconnect with neighbors',
          'Review and update plan',
          'Replenish water and food stocks',
        ],
      },
      notes: 'Always follow local authorities.',
    },
    B: {
      title: 'Evacuation Plan',
      whyThisFitsYou: 'This plan provides a clear path to leave your home safely when conditions require.',
      topPrioritiesThisWeek: [
        'Pack a basic go-bag with essentials',
        'Identify two evacuation routes from your area',
        'Share plan with all household members',
        'Save emergency contacts in phone',
        'Know your nearest evacuation center',
      ],
      triggers: [
        'Mandatory evacuation order issued',
        'Fire or flooding approaching your area',
        'Building structural damage detected',
        'Chemical or hazardous material spill nearby',
        'Prolonged utility failure with no restoration estimate',
        'Civil unrest making staying unsafe',
      ],
      objectives: [
        'Evacuate safely and quickly',
        'Reach designated safe location',
        'Bring essential documents and supplies',
        'Account for all family members and pets',
        'Notify emergency contacts of your status',
        'Minimize time spent in danger zone',
      ],
      homeSetup: {
        power: [
          'Know how to quickly turn off main power',
          'Keep power banks charged for travel',
          'Have car charger ready',
          'Pack flashlight in go-bag',
        ],
        water: [
          'Pack 1L per person in go-bag',
          'Know locations of water sources on route',
          'Carry water filter or purification tablets',
          'Keep bottles ready to grab',
        ],
        cooking: [
          'Pack non-perishable snacks only',
          'No cooking equipment needed for evacuation',
          'Focus on high-energy, ready-to-eat foods',
        ],
        communicationsBackup: [
          'Save all contacts offline',
          'Have paper map of evacuation routes',
          'Know local radio frequencies',
        ],
        documentsHandling: [
          'Keep all originals in one grab-folder',
          'Store copies digitally',
          'Know what to take, what to leave',
        ],
      },
      communications: {
        checkInRule: 'Text family hourly during evacuation',
        outOfAreaContactRole: 'Out-of-area contact coordinates information sharing',
        familyMeetingRule: 'Check in at each planned stop or every hour',
      },
      mobility: {
        constraints: '',
        transport: '',
        meetingPoints: {
          primary: 'Front of building or main entrance',
          secondary: 'Neighbor\'s house or nearby landmark',
        },
        routeNotes: [
          'Primary route: main roads toward safe zone',
          'Secondary route: avoid main highways if blocked',
          'Know locations of gas stations on route',
        ],
      },
      pets: {
        hasPets: false,
        petCareChecklist: [
          'Have pet carrier ready to go',
          'Pack pet food for 7 days',
          'Keep pet identification updated',
        ],
      },
      essentialsGrabList: [
        'Go-bag with essentials', 'Important documents (IDs, insurance)',
        'Cash and credit cards', 'Phone, charger, power bank',
        'Medications for 7 days', 'Water (1L per person)',
        'Non-perishable snacks', 'Pet carrier and pet food (if applicable)',
        'Change of clothes', 'Blanket or sleeping bag',
        'First aid kit', 'Map of area',
      ],
      stepsFirstHour: [
        'Grab pre-packed go-bag',
        'Secure home (turn off gas, lock doors)',
        'Load vehicle or prepare to leave on foot',
        'Confirm all family members are ready',
        'Text/call emergency contacts with plan',
        'Check traffic and route conditions',
        'Take photos of home for insurance',
        'Leave quickly once ready',
      ],
      stepsFirstDay: [
        'Follow designated evacuation routes',
        'Stop at safe checkpoints if needed',
        'Conserve fuel and resources',
        'Check in with family hourly',
        'Register at evacuation center if applicable',
        'Document route and conditions',
        'Stay calm and help others if safe',
        'Find safe accommodation',
      ],
      checklists: {
        beforeDisruption: [
          'Go-bag packed and by door',
          'Vehicle fueled or transport arranged',
          'Important documents in grab-folder',
          'Everyone knows the plan',
          'Routes mapped and saved offline',
          'Pet supplies ready if applicable',
        ],
        duringDisruption: [
          'Leave as soon as order given',
          'Follow designated routes',
          'Stay in contact with family',
          'Avoid flooded or dangerous roads',
          'Help neighbors if safe',
          'Stay calm and focused',
        ],
        afterDisruption: [
          'Wait for all-clear before returning',
          'Check home for damage before entering',
          'Document all damage',
          'File insurance claims',
          'Restock emergency supplies',
          'Update evacuation plan based on experience',
        ],
      },
      notes: 'Always follow local authorities.',
    },
  },
  pt: {
    A: {
      title: 'Plano de Abrigo no Local',
      whyThisFitsYou: 'Este plano foi concebido para manter a sua família segura em casa durante perturbações.',
      topPrioritiesThisWeek: [
        'Verificar armazenamento de água e encher recipientes',
        'Testar lanternas e ter pilhas de reserva',
        'Localizar documentos importantes',
        'Partilhar este plano com membros da família',
        'Criar uma lista simples de contactos de emergência',
      ],
      triggers: [
        'Aviso de tempo severo emitido para a sua área',
        'Falha de energia com duração superior a 2 horas',
        'Autoridades locais aconselham ficar em casa',
        'Atividade ou distúrbios invulgares no bairro',
        'Alerta de desastre natural (terramoto, risco de inundação)',
        'Aviso de saúde pública recomendando isolamento',
      ],
      objectives: [
        'Proteger a casa e todos os pontos de entrada',
        'Garantir que água e alimentos estão acessíveis',
        'Carregar todos os dispositivos e preparar energia de reserva',
        'Verificar presença de todos os membros da família',
        'Estabelecer comunicação com contactos familiares',
        'Monitorizar canais de notícias oficiais',
      ],
      homeSetup: {
        power: [
          'Localizar lanternas e pilhas em locais acessíveis',
          'Carregar powerbanks e dispositivos',
          'Saber localização do disjuntor',
          'Considerar velas/lanternas como reserva',
        ],
        water: [
          'Encher banheira e recipientes grandes quando alerta é emitido',
          'Guardar 3L por pessoa por dia',
          'Saber como fechar válvula principal de água',
          'Ter pastilhas de purificação de água',
        ],
        cooking: [
          'Ter alimentos não perecíveis que não precisam de cozinhar',
          'Se disponível, ter fogão de campismo como reserva',
          'Saber como usar cozinha alternativa com segurança',
        ],
        communicationsBackup: [
          'Ter rádio a pilhas ou de manivela',
          'Manter carregadores de telefone em várias divisões',
          'Escrever números de telefone importantes em papel',
        ],
        documentsHandling: [
          'Guardar cópias em saco impermeável',
          'Saber localização dos originais',
          'Considerar backup digital em cloud segura',
        ],
      },
      communications: {
        checkInRule: 'Comunicar com família a cada 2 horas por mensagem',
        outOfAreaContactRole: 'Contacto fora da área recebe atualizações e transmite informação',
        familyMeetingRule: 'Reunir na sala a cada 4 horas para discutir situação',
      },
      mobility: {
        constraints: '',
        transport: '',
        meetingPoints: {
          primary: 'Sala de estar ou divisão segura designada',
          secondary: 'Cozinha perto dos suprimentos de emergência',
        },
        routeNotes: [
          'Identificar divisão mais segura longe de janelas',
          'Planear rotas acessíveis dentro de casa',
          'Conhecer múltiplas saídas de cada divisão',
        ],
      },
      pets: {
        hasPets: false,
        petCareChecklist: [
          'Manter comida e água de animais para 7 dias',
          'Ter transportadora acessível',
          'Guardar medicamentos de animais',
        ],
      },
      essentialsGrabList: [
        'Telemóvel e carregador', 'Lanterna e pilhas', 'Kit de primeiros socorros',
        'Pasta de documentos importantes', 'Dinheiro e cartões', 'Medicamentos',
        'Garrafas de água', 'Snacks e alimentos não perecíveis', 'Rádio',
        'Cobertor', 'Apito para sinalização', 'Multiferramenta ou canivete',
      ],
      stepsFirstHour: [
        'Verificar se portas e janelas estão protegidas',
        'Ligar rádio ou notícias para atualizações',
        'Reunir membros da família em local central',
        'Localizar lanternas e kit de emergência',
        'Encher banheira e recipientes com água',
        'Carregar todos os dispositivos',
        'Confirmar presença de todos',
        'Informar todos sobre o plano',
      ],
      stepsFirstDay: [
        'Racionar comida e água se necessário',
        'Verificar vizinhos se for seguro',
        'Monitorizar notícias locais para atualizações',
        'Manter dispositivos carregados, minimizar uso',
        'Documentar quaisquer danos para seguro',
        'Descansar por turnos se a situação continuar',
        'Verificar vizinhos vulneráveis se seguro',
        'Reavaliar situação regularmente',
      ],
      checklists: {
        beforeDisruption: [
          'Kit de emergência abastecido e acessível',
          'Telemóvel e dispositivos carregados',
          'Contactos importantes guardados offline',
          'Armazenamento de água cheio',
          'Kit de primeiros socorros verificado',
          'Lanternas e pilhas prontas',
        ],
        duringDisruption: [
          'Manter-se informado via rádio',
          'Conservar recursos',
          'Ficar em casa salvo indicação contrária',
          'Comunicar com família regularmente',
          'Documentar danos se seguro',
          'Evitar deslocações desnecessárias',
        ],
        afterDisruption: [
          'Verificar danos estruturais antes de se mover',
          'Reabastecer suprimentos de emergência',
          'Registar reclamações de seguro se necessário',
          'Reconectar com vizinhos',
          'Rever e atualizar plano',
          'Repor stocks de água e comida',
        ],
      },
      notes: 'Siga sempre as instruções das autoridades locais.',
    },
    B: {
      title: 'Plano de Evacuação',
      whyThisFitsYou: 'Este plano fornece um caminho claro para sair de casa em segurança quando necessário.',
      topPrioritiesThisWeek: [
        'Preparar uma mochila básica com essenciais',
        'Identificar duas rotas de evacuação da sua área',
        'Partilhar plano com todos os membros da família',
        'Guardar contactos de emergência no telemóvel',
        'Saber onde fica o centro de evacuação mais próximo',
      ],
      triggers: [
        'Ordem de evacuação obrigatória emitida',
        'Incêndio ou inundação a aproximar-se da sua área',
        'Danos estruturais no edifício detetados',
        'Derrame químico ou de materiais perigosos próximo',
        'Falha prolongada de serviços sem previsão de restauro',
        'Distúrbios civis tornando permanência insegura',
      ],
      objectives: [
        'Evacuar de forma segura e rápida',
        'Chegar ao local seguro designado',
        'Levar documentos e suprimentos essenciais',
        'Verificar todos os membros da família e animais',
        'Notificar contactos de emergência do seu estado',
        'Minimizar tempo em zona de perigo',
      ],
      homeSetup: {
        power: [
          'Saber como desligar energia principal rapidamente',
          'Manter powerbanks carregados para viagem',
          'Ter carregador de carro pronto',
          'Incluir lanterna na mochila',
        ],
        water: [
          'Incluir 1L por pessoa na mochila',
          'Conhecer localizações de fontes de água na rota',
          'Levar filtro ou pastilhas de purificação',
          'Ter garrafas prontas para agarrar',
        ],
        cooking: [
          'Incluir apenas snacks não perecíveis',
          'Não é necessário equipamento de cozinha para evacuação',
          'Focar em alimentos energéticos prontos a comer',
        ],
        communicationsBackup: [
          'Guardar todos os contactos offline',
          'Ter mapa em papel das rotas de evacuação',
          'Conhecer frequências de rádio locais',
        ],
        documentsHandling: [
          'Manter todos os originais numa pasta de documentos',
          'Guardar cópias digitalmente',
          'Saber o que levar, o que deixar',
        ],
      },
      communications: {
        checkInRule: 'Enviar mensagem à família de hora a hora durante evacuação',
        outOfAreaContactRole: 'Contacto fora da área coordena partilha de informação',
        familyMeetingRule: 'Verificar em cada paragem planeada ou a cada hora',
      },
      mobility: {
        constraints: '',
        transport: '',
        meetingPoints: {
          primary: 'Frente do edifício ou entrada principal',
          secondary: 'Casa do vizinho ou ponto de referência próximo',
        },
        routeNotes: [
          'Rota primária: estradas principais em direção a zona segura',
          'Rota secundária: evitar autoestradas se bloqueadas',
          'Conhecer localizações de bombas de gasolina na rota',
        ],
      },
      pets: {
        hasPets: false,
        petCareChecklist: [
          'Ter transportadora pronta',
          'Incluir comida de animal para 7 dias',
          'Manter identificação do animal atualizada',
        ],
      },
      essentialsGrabList: [
        'Mochila de emergência com essenciais', 'Documentos importantes (IDs, seguros)',
        'Dinheiro e cartões de crédito', 'Telemóvel, carregador, powerbank',
        'Medicamentos para 7 dias', 'Água (1L por pessoa)',
        'Snacks não perecíveis', 'Transportadora de animais e comida (se aplicável)',
        'Muda de roupa', 'Cobertor ou saco-cama',
        'Kit de primeiros socorros', 'Mapa da área',
      ],
      stepsFirstHour: [
        'Pegar na mochila de emergência pré-preparada',
        'Proteger casa (fechar gás, trancar portas)',
        'Carregar veículo ou preparar para sair a pé',
        'Confirmar que todos estão prontos',
        'Enviar mensagem/ligar contactos de emergência',
        'Verificar trânsito e condições da rota',
        'Tirar fotos da casa para seguro',
        'Sair rapidamente quando prontos',
      ],
      stepsFirstDay: [
        'Seguir rotas de evacuação designadas',
        'Parar em pontos de controlo seguros se necessário',
        'Conservar combustível e recursos',
        'Comunicar com família de hora a hora',
        'Registar-se no centro de evacuação se aplicável',
        'Documentar rota e condições',
        'Manter calma e ajudar outros se seguro',
        'Encontrar alojamento seguro',
      ],
      checklists: {
        beforeDisruption: [
          'Mochila preparada e junto à porta',
          'Veículo abastecido ou transporte arranjado',
          'Documentos importantes na pasta',
          'Todos conhecem o plano',
          'Rotas mapeadas e guardadas offline',
          'Suprimentos de animais prontos se aplicável',
        ],
        duringDisruption: [
          'Sair assim que ordem dada',
          'Seguir rotas designadas',
          'Manter contacto com família',
          'Evitar estradas inundadas ou perigosas',
          'Ajudar vizinhos se seguro',
          'Manter calma e foco',
        ],
        afterDisruption: [
          'Esperar por autorização antes de regressar',
          'Verificar casa por danos antes de entrar',
          'Documentar todos os danos',
          'Registar reclamações de seguro',
          'Reabastecer suprimentos de emergência',
          'Atualizar plano de evacuação baseado na experiência',
        ],
      },
      notes: 'Siga sempre as instruções das autoridades locais.',
    },
  },
};

/**
 * Convert rich AI output to PlanData format
 */
function aiOutputToPlanData(output: AIPlanOutput): PlanData {
  return {
    meta: {
      planType: output.planType as PlanType,
      locale: output.locale,
      updatedAt: new Date().toISOString(),
    },
    // Rich fields from new schema
    whyThisFitsYou: output.whyThisFitsYou,
    topPrioritiesThisWeek: output.topPrioritiesThisWeek,
    triggers: output.triggers,
    objectives: output.objectives,
    homeSetup: output.homeSetup,
    meetingPoints: output.mobility.meetingPoints,
    contacts: {
      primary: '',
      secondary: '',
      outOfArea: '',
    },
    communications: output.communications,
    mobility: {
      constraints: output.mobility.constraints,
      transport: output.mobility.transport,
      notes: output.mobility.routeNotes.join('\n'),
    },
    routeNotes: output.mobility.routeNotes,
    pets: output.pets,
    essentialsGrabList: output.essentialsGrabList,
    stepsFirstHour: output.stepsFirstHour,
    stepsFirstDay: output.stepsFirstDay,
    checklists: output.checklists,
    notes: output.notes,
  };
}

/**
 * Get fallback plan when AI fails
 */
function getFallbackPlan(planType: PlanType, input: AIPlanInput): PlanData {
  const template = FALLBACK_TEMPLATES[input.locale][planType];
  
  // Determine if has pets from rich input or legacy fields
  const hasPets = input.household?.pets ? input.household.pets > 0 : input.hasPets;
  const hasKids = input.household?.kids ? input.household.kids > 0 : input.hasKids;
  const petTypes = input.household?.petTypes || [];
  
  // Add pet/kid specific items if needed
  const grabList = [...template.essentialsGrabList];
  if (hasPets && !grabList.some(i => i.toLowerCase().includes('pet'))) {
    grabList.push(input.locale === 'pt' ? 'Comida e água para animais' : 'Pet food and water');
  }
  if (hasKids && !grabList.some(i => i.toLowerCase().includes('child'))) {
    grabList.push(input.locale === 'pt' ? 'Itens essenciais para crianças' : 'Essentials for children');
  }
  
  // Determine mobility level from rich input or legacy
  const mobilityLevel = input.household?.mobilityConstraints?.includes('limited_mobility') 
    ? 'low' 
    : input.mobilityLevel || 'high';
  
  return {
    meta: {
      planType,
      locale: input.locale,
      updatedAt: new Date().toISOString(),
    },
    whyThisFitsYou: template.whyThisFitsYou,
    topPrioritiesThisWeek: template.topPrioritiesThisWeek,
    triggers: template.triggers,
    objectives: template.objectives,
    homeSetup: template.homeSetup,
    meetingPoints: template.mobility.meetingPoints,
    contacts: {
      primary: '',
      secondary: '',
      outOfArea: '',
    },
    communications: template.communications,
    mobility: {
      constraints: mobilityLevel === 'low' 
        ? (input.locale === 'pt' ? 'Considerar necessidades de mobilidade especiais' : 'Consider special mobility needs')
        : template.mobility.constraints,
      transport: template.mobility.transport,
      notes: template.mobility.routeNotes.join('\n'),
    },
    routeNotes: template.mobility.routeNotes,
    pets: {
      hasPets: hasPets || false,
      petCareChecklist: hasPets 
        ? petTypes.length > 0 
          ? template.pets.petCareChecklist.map(item => 
              item.replace('pet', petTypes[0]).replace('animal', petTypes[0])
            )
          : template.pets.petCareChecklist
        : [],
    },
    essentialsGrabList: grabList,
    stepsFirstHour: template.stepsFirstHour,
    stepsFirstDay: template.stepsFirstDay,
    checklists: template.checklists,
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
    // Rich location (no exact address)
    location: input.location,
    // Household composition
    household: input.household,
    // Home reality signals
    homeReality: input.homeReality,
    // Risk context
    riskContext: input.riskContext,
    // Supplies context
    suppliesContext: input.suppliesContext,
    // Preferences
    preferences: input.preferences,
    // Legacy fields for backwards compatibility
    region: input.region,
    country: input.country,
    riskLevelBand: input.riskLevelBand,
    householdSizeBucket: input.householdSizeBucket,
    hasPets: input.hasPets,
    hasKids: input.hasKids,
    mobilityLevel: input.mobilityLevel,
    preparednessDays: input.preparednessDays,
    constraints: input.constraints,
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
