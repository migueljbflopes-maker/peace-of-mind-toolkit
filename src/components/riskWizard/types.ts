// Wizard answer state
export interface WizardAnswers {
  // Location section
  country_code: string;
  city: string;
  postal_code: string;
  home_type: string;
  mobility_out: string;
  
  // Household section
  household_size: string;
  special_needs: string[];
  pets: string;
  
  // Preparedness section
  water_days: string;
  food_days: string;
  power_light: string;
  cash_buffer: string;
  docs_ready: string;
  comms_offline: string;
  plan_checkin: string;
  kit_72h: string;
}

export const defaultWizardAnswers: WizardAnswers = {
  country_code: '',
  city: '',
  postal_code: '',
  home_type: '',
  mobility_out: '',
  household_size: '',
  special_needs: [],
  pets: '',
  water_days: '',
  food_days: '',
  power_light: '',
  cash_buffer: '',
  docs_ready: '',
  comms_offline: '',
  plan_checkin: '',
  kit_72h: '',
};

// Draft state for persistence
export interface WizardDraft {
  answers: WizardAnswers;
  currentStepIndex: number;
  updatedAt: string;
  version: string;
}

// Computed results
export interface WizardBreakdown {
  location_context: number;
  household_complexity: number;
  mobility_constraints: number;
  preparedness_autonomy: number;
}

export interface TopDriver {
  key: string;
  label: string;
  value: number;
  priority: string;
}

export interface WizardResult {
  readinessScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  breakdown: WizardBreakdown;
  topDrivers: TopDriver[];
  inputs: WizardAnswers;
  updatedAt: string;
}

// Geo risk cache (optional enhancement)
export interface GeoRiskData {
  exposureScore: number;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
  cachedAt: string;
}
