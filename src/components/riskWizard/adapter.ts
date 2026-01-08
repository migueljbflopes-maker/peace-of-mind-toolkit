/**
 * Adapter layer that maps wizard answers to the existing scoring engine
 * WITHOUT changing any existing business logic
 */

import type { WizardAnswers, WizardBreakdown, WizardResult, TopDriver } from './types';

// Maps wizard answers to the original calculator's expected input shape
export function mapWizardToLegacy(answers: WizardAnswers) {
  // Map home_type to areaType (approximate)
  const areaTypeMap: Record<string, string> = {
    house: 'Suburban',
    row_house: 'Suburban',
    apartment: 'Urban',
    room: 'Urban',
  };
  
  // Map mobility_out to mobility
  const mobilityMap: Record<string, string> = {
    easy: 'Car available',
    maybe: 'Public transport only',
    hard: 'Limited mobility',
  };
  
  // Map household_size
  const householdMap: Record<string, string> = {
    '1': '1',
    '2': '2',
    '3_4': '3–4',
    '5_plus': '5–6', // Map 5+ to 5–6 for legacy
  };
  
  // Map special_needs to extraSupport
  const needsMap: Record<string, string> = {
    none: 'None',
    child_under_5: 'Kids',
    elder_70_plus: 'Elderly',
    limited_mobility: 'Medical needs',
    medical_dependency: 'Medical needs',
  };
  
  const extraSupport = answers.special_needs.includes('none') 
    ? ['None']
    : answers.special_needs.map(n => needsMap[n] || n);
  
  // Add pets
  if (answers.pets === 'yes_1' || answers.pets === 'yes_2_plus') {
    if (!extraSupport.includes('Pets')) {
      extraSupport.push('Pets');
    }
  }
  
  // Get country label from code
  const countryLabel = answers.country_code; // Keep as-is for now
  
  return {
    country: countryLabel,
    city: answers.city,
    areaType: areaTypeMap[answers.home_type] || 'Suburban',
    nearInfrastructure: 'Not sure', // Default since wizard doesn't ask this directly
    householdSize: householdMap[answers.household_size] || '1',
    extraSupport,
    mobility: mobilityMap[answers.mobility_out] || 'Car available',
  };
}

/**
 * Calculate the 4-dimension breakdown based on wizard answers
 * This extends the original logic to include preparedness signals
 */
export function calculateWizardBreakdown(answers: WizardAnswers): WizardBreakdown {
  // Location context (home type + mobility)
  let locationContext = 20;
  switch (answers.home_type) {
    case 'apartment': locationContext += 25; break;
    case 'room': locationContext += 30; break;
    case 'row_house': locationContext += 15; break;
    case 'house': locationContext += 10; break;
  }
  // Add mobility factor
  switch (answers.mobility_out) {
    case 'hard': locationContext += 30; break;
    case 'maybe': locationContext += 15; break;
    case 'easy': locationContext += 5; break;
  }

  // Household complexity (size + special needs + pets)
  let householdComplexity = 10;
  switch (answers.household_size) {
    case '1': householdComplexity += 5; break;
    case '2': householdComplexity += 15; break;
    case '3_4': householdComplexity += 30; break;
    case '5_plus': householdComplexity += 50; break;
  }
  if (answers.special_needs.includes('child_under_5')) householdComplexity += 15;
  if (answers.special_needs.includes('elder_70_plus')) householdComplexity += 15;
  if (answers.special_needs.includes('limited_mobility')) householdComplexity += 20;
  if (answers.special_needs.includes('medical_dependency')) householdComplexity += 25;
  if (answers.pets === 'yes_1') householdComplexity += 5;
  if (answers.pets === 'yes_2_plus') householdComplexity += 10;

  // Mobility constraints
  let mobilityConstraints = 15;
  switch (answers.mobility_out) {
    case 'easy': mobilityConstraints += 10; break;
    case 'maybe': mobilityConstraints += 40; break;
    case 'hard': mobilityConstraints += 70; break;
  }

  // Preparedness autonomy (based on actual preparedness answers)
  let preparednessScore = 0;
  
  // Water (0-25 points)
  switch (answers.water_days) {
    case '7_plus': preparednessScore += 25; break;
    case '4_7': preparednessScore += 20; break;
    case '2_3': preparednessScore += 12; break;
    case '0_1': preparednessScore += 3; break;
  }
  
  // Food (0-20 points)
  switch (answers.food_days) {
    case '7_plus': preparednessScore += 20; break;
    case '4_7': preparednessScore += 15; break;
    case '2_3': preparednessScore += 8; break;
    case '0_1': preparednessScore += 2; break;
  }
  
  // Power (0-15 points)
  switch (answers.power_light) {
    case 'strong': preparednessScore += 15; break;
    case 'good': preparednessScore += 12; break;
    case 'basic': preparednessScore += 6; break;
    case 'none': preparednessScore += 0; break;
  }
  
  // Cash (0-10 points)
  switch (answers.cash_buffer) {
    case '500_plus': preparednessScore += 10; break;
    case '200_500': preparednessScore += 8; break;
    case '50_200': preparednessScore += 5; break;
    case 'lt_50': preparednessScore += 1; break;
  }
  
  // Docs (0-10 points)
  switch (answers.docs_ready) {
    case 'red_folder': preparednessScore += 10; break;
    case 'organized': preparednessScore += 8; break;
    case 'somewhere': preparednessScore += 4; break;
    case 'scattered': preparednessScore += 0; break;
  }
  
  // Comms (0-10 points)
  switch (answers.comms_offline) {
    case 'radio_plan': preparednessScore += 10; break;
    case 'powerbank': preparednessScore += 7; break;
    case 'phone_only': preparednessScore += 3; break;
    case 'no': preparednessScore += 0; break;
  }
  
  // Plan (0-5 points)
  switch (answers.plan_checkin) {
    case 'complete': preparednessScore += 5; break;
    case 'basic_plan': preparednessScore += 4; break;
    case 'contact_only': preparednessScore += 2; break;
    case 'none': preparednessScore += 0; break;
  }
  
  // Kit (0-5 points)
  switch (answers.kit_72h) {
    case 'complete': preparednessScore += 5; break;
    case 'almost': preparednessScore += 4; break;
    case 'partial': preparednessScore += 2; break;
    case 'no': preparednessScore += 0; break;
  }
  
  // Preparedness autonomy is the inverse of need (higher score = more prepared = lower need)
  const preparednessAutonomy = Math.min(100, 100 - preparednessScore);

  return {
    location_context: Math.min(100, locationContext),
    household_complexity: Math.min(100, householdComplexity),
    mobility_constraints: Math.min(100, mobilityConstraints),
    preparedness_autonomy: preparednessAutonomy,
  };
}

/**
 * Calculate the overall readiness score (0-100)
 * Higher score = more prepared / lower risk
 */
export function calculateReadinessScore(answers: WizardAnswers): number {
  let score = 0;
  const maxScore = 100;
  
  // Water (0-20 points)
  switch (answers.water_days) {
    case '7_plus': score += 20; break;
    case '4_7': score += 15; break;
    case '2_3': score += 8; break;
    case '0_1': score += 2; break;
  }
  
  // Food (0-15 points)
  switch (answers.food_days) {
    case '7_plus': score += 15; break;
    case '4_7': score += 12; break;
    case '2_3': score += 6; break;
    case '0_1': score += 1; break;
  }
  
  // Power (0-12 points)
  switch (answers.power_light) {
    case 'strong': score += 12; break;
    case 'good': score += 9; break;
    case 'basic': score += 4; break;
    case 'none': score += 0; break;
  }
  
  // Cash (0-10 points)
  switch (answers.cash_buffer) {
    case '500_plus': score += 10; break;
    case '200_500': score += 8; break;
    case '50_200': score += 5; break;
    case 'lt_50': score += 1; break;
  }
  
  // Docs (0-10 points)
  switch (answers.docs_ready) {
    case 'red_folder': score += 10; break;
    case 'organized': score += 8; break;
    case 'somewhere': score += 4; break;
    case 'scattered': score += 0; break;
  }
  
  // Comms (0-10 points)
  switch (answers.comms_offline) {
    case 'radio_plan': score += 10; break;
    case 'powerbank': score += 7; break;
    case 'phone_only': score += 3; break;
    case 'no': score += 0; break;
  }
  
  // Plan (0-12 points)
  switch (answers.plan_checkin) {
    case 'complete': score += 12; break;
    case 'basic_plan': score += 8; break;
    case 'contact_only': score += 4; break;
    case 'none': score += 0; break;
  }
  
  // Kit (0-11 points)
  switch (answers.kit_72h) {
    case 'complete': score += 11; break;
    case 'almost': score += 8; break;
    case 'partial': score += 4; break;
    case 'no': score += 0; break;
  }
  
  return Math.min(maxScore, Math.max(0, score));
}

/**
 * Get risk level from readiness score
 */
export function getRiskLevel(readinessScore: number): 'Low' | 'Medium' | 'High' {
  if (readinessScore >= 60) return 'Low';
  if (readinessScore >= 30) return 'Medium';
  return 'High';
}

/**
 * Get top drivers (areas needing most attention)
 */
export function getTopDrivers(breakdown: WizardBreakdown): TopDriver[] {
  const drivers: TopDriver[] = [
    { 
      key: 'location_context', 
      label: 'Location & Context', 
      value: breakdown.location_context,
      priority: 'Review local emergency resources and alert systems.'
    },
    { 
      key: 'household_complexity', 
      label: 'Household Needs', 
      value: breakdown.household_complexity,
      priority: 'Create a household communication plan with clear roles.'
    },
    { 
      key: 'mobility_constraints', 
      label: 'Mobility', 
      value: breakdown.mobility_constraints,
      priority: 'Identify accessible evacuation routes and backup transport.'
    },
    { 
      key: 'preparedness_autonomy', 
      label: 'Supplies & Readiness', 
      value: breakdown.preparedness_autonomy,
      priority: 'Build a 14-day supplies reserve tailored to your household.'
    },
  ];
  
  // Sort by value (highest = most attention needed)
  return drivers.sort((a, b) => b.value - a.value).slice(0, 3);
}

/**
 * Compute full wizard result
 */
export function computeWizardResult(answers: WizardAnswers): WizardResult {
  const breakdown = calculateWizardBreakdown(answers);
  const readinessScore = calculateReadinessScore(answers);
  const riskLevel = getRiskLevel(readinessScore);
  const topDrivers = getTopDrivers(breakdown);
  
  return {
    readinessScore,
    riskLevel,
    breakdown,
    topDrivers,
    inputs: answers,
    updatedAt: new Date().toISOString(),
  };
}
