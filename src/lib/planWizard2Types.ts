/**
 * Plan Wizard 2.0 Types
 * 
 * Comprehensive types for the multi-step wizard that generates
 * exhaustive, scenario-based emergency plans.
 */

// Supported emergency scenarios
export type EmergencyScenario = 
  | 'war'
  | 'flood'
  | 'wildfire'
  | 'earthquake'
  | 'storm'
  | 'blackout'
  | 'civil_unrest'
  | 'chemical';

export const SCENARIO_LABELS = {
  en: {
    war: 'War / Conflict',
    flood: 'Flood',
    wildfire: 'Wildfire',
    earthquake: 'Earthquake',
    storm: 'Severe Storm',
    blackout: 'Power Outage',
    civil_unrest: 'Civil Unrest',
    chemical: 'Chemical / Industrial',
  },
  pt: {
    war: 'Guerra / Conflito',
    flood: 'Inundação',
    wildfire: 'Incêndio Florestal',
    earthquake: 'Terramoto',
    storm: 'Tempestade Severa',
    blackout: 'Apagão',
    civil_unrest: 'Agitação Civil',
    chemical: 'Químico / Industrial',
  },
} as const;

export const SCENARIO_ICONS: Record<EmergencyScenario, string> = {
  war: '⚔️',
  flood: '🌊',
  wildfire: '🔥',
  earthquake: '🌍',
  storm: '🌪️',
  blackout: '🔌',
  civil_unrest: '🚨',
  chemical: '☣️',
};

// Safe destination for evacuation
export interface SafeLocation {
  id: string;
  label: string;
  cityOrArea: string;
  type: 'family' | 'friend' | 'hotel' | 'shelter' | 'other';
  priority: number;
  notes?: string;
}

// Personal priorities for decision making
export type Priority = 
  | 'speed'
  | 'privacy'
  | 'low_cost'
  | 'avoid_crowds'
  | 'stay_near_home'
  | 'cross_border_ok'
  | 'family_first'
  | 'pets_priority';

export const PRIORITY_LABELS = {
  en: {
    speed: 'Speed / Quick action',
    privacy: 'Privacy / Low profile',
    low_cost: 'Low cost',
    avoid_crowds: 'Avoid crowds',
    stay_near_home: 'Stay near home',
    cross_border_ok: 'Cross-border OK',
    family_first: 'Family safety first',
    pets_priority: 'Pets are priority',
  },
  pt: {
    speed: 'Rapidez / Ação rápida',
    privacy: 'Privacidade / Perfil baixo',
    low_cost: 'Baixo custo',
    avoid_crowds: 'Evitar multidões',
    stay_near_home: 'Ficar perto de casa',
    cross_border_ok: 'Atravessar fronteira OK',
    family_first: 'Segurança família primeiro',
    pets_priority: 'Animais são prioridade',
  },
} as const;

// Communication preferences
export type CommChannel = 'whatsapp' | 'sms' | 'call' | 'signal' | 'email';

export const COMM_LABELS = {
  en: {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    call: 'Phone Call',
    signal: 'Signal',
    email: 'Email',
  },
  pt: {
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    call: 'Chamada',
    signal: 'Signal',
    email: 'Email',
  },
} as const;

// Wizard step inputs
export interface WizardStep1Location {
  country: string;
  city: string;
  neighborhood?: string;
  hasCar: boolean;
  adults: number;
  kids: number;
  pets: number;
  petTypes?: string[];
  mobilityConstraints?: string;
  languages: string[];
}

export interface WizardStep2SafeLocations {
  locations: SafeLocation[];
}

export interface WizardStep3Resources {
  cashRange: 'none' | 'under_100' | '100_500' | '500_plus';
  docsReady: boolean;
  medicationsNeeded: boolean;
  medicationsList?: string;
  goBagStatus: 'none' | 'basic' | 'advanced';
}

export interface WizardStep4Scenarios {
  selectedScenarios: EmergencyScenario[];
}

export interface WizardStep5Priorities {
  selectedPriorities: Priority[];
}

export interface WizardStep6Comms {
  meetingPointA: string;
  meetingPointB: string;
  preferredChannels: CommChannel[];
  outOfAreaContact?: string;
}

// Complete wizard inputs
export interface PlanWizardInputs {
  step1: WizardStep1Location;
  step2: WizardStep2SafeLocations;
  step3: WizardStep3Resources;
  step4: WizardStep4Scenarios;
  step5: WizardStep5Priorities;
  step6: WizardStep6Comms;
}

// Generated Plan A structure (Shelter / Stay)
export interface GeneratedPlanA {
  overview: string;
  triggers: string[];
  first_hour: string[];
  first_24h: string[];
  first_week: string[];
  checklists: {
    docs: string[];
    meds: string[];
    money: string[];
    comms: string[];
    gear: string[];
    pets_kids: string[];
    home: string[];
  };
  comms_plan: string;
  meetup_points: {
    primary: string;
    secondary: string;
  };
  notes: string;
}

// Generated Plan B structure (Evacuate / Move)
export interface GeneratedPlanB {
  overview: string;
  triggers: string[];
  go_now_checklist: string[];
  routes: {
    primary: string;
    alt1: string;
    alt2: string;
    fallback: string;
  };
  destinations_ranked: Array<{
    label: string;
    reason: string;
    priority: number;
  }>;
  border_crossing_notes?: string;
  vehicle_plan: string;
  no_go_zones: string[];
  comms_plan: string;
  meetup_points: {
    primary: string;
    secondary: string;
  };
  notes: string;
}

// Database record
export interface PremiumPlan {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  wizard_inputs: PlanWizardInputs;
  home_location: {
    country: string;
    city: string;
    neighborhood?: string;
  } | null;
  safe_locations: SafeLocation[];
  constraints: {
    hasCar: boolean;
    adults: number;
    kids: number;
    pets: number;
    mobilityConstraints?: string;
    languages: string[];
    cashRange: string;
    docsReady: boolean;
    medicationsNeeded: boolean;
    goBagStatus: string;
  };
  scenario_set: EmergencyScenario[];
  priorities: Priority[];
  comms_config: {
    meetingPointA: string;
    meetingPointB: string;
    preferredChannels: CommChannel[];
    outOfAreaContact?: string;
  };
  plan_a_json: GeneratedPlanA | null;
  plan_b_json: GeneratedPlanB | null;
  last_generated_at: string | null;
  generation_version: number;
  status: 'draft' | 'generated' | 'reviewed';
}

// Default empty wizard inputs
export function createEmptyWizardInputs(): PlanWizardInputs {
  return {
    step1: {
      country: '',
      city: '',
      hasCar: false,
      adults: 1,
      kids: 0,
      pets: 0,
      languages: [],
    },
    step2: {
      locations: [],
    },
    step3: {
      cashRange: 'none',
      docsReady: false,
      medicationsNeeded: false,
      goBagStatus: 'none',
    },
    step4: {
      selectedScenarios: [],
    },
    step5: {
      selectedPriorities: [],
    },
    step6: {
      meetingPointA: '',
      meetingPointB: '',
      preferredChannels: [],
    },
  };
}

// IndexedDB cache key
export const PLANS_CACHE_KEY = 'resilient_premium_plans_v2';
