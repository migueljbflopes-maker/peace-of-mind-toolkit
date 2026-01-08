import type { LucideIcon } from 'lucide-react';
import {
  MapPin, Home, Route, Users, HeartPulse, PawPrint,
  Droplets, Utensils, BatteryCharging, Wallet,
  FileText, Radio, ClipboardList, Backpack
} from 'lucide-react';

export type StepType = 'location' | 'single' | 'multi';

export interface FieldConfig {
  key: string;
  label: string;
  kind: 'select' | 'text';
  required: boolean;
  placeholder?: string;
  options?: string; // Reference to options constant
}

export interface StepOption {
  value: string;
  label: string;
}

export interface MultiBehavior {
  noneExcludesOthers?: boolean;
}

export interface WizardStep {
  id: string;
  type: StepType;
  required: boolean;
  title: string;
  helper: string;
  icon: string;
  image: string;
  fields?: FieldConfig[];
  options?: StepOption[];
  multiBehavior?: MultiBehavior;
  onAnswer?: { callGeoRisk?: boolean };
}

export interface WizardSection {
  id: string;
  title: string;
  intro: string;
  steps: WizardStep[];
}

export interface WizardSchema {
  version: string;
  title: string;
  subtitle: string;
  sections: WizardSection[];
}

// Icon lookup map
export const STEP_ICONS: Record<string, LucideIcon> = {
  MapPin,
  Home,
  Route,
  Users,
  HeartPulse,
  PawPrint,
  Droplets,
  Utensils,
  BatteryCharging,
  Wallet,
  FileText,
  Radio,
  ClipboardList,
  Backpack,
};

// Country list (same as existing)
export const COUNTRY_LIST = [
  { value: 'AT', label: 'Austria' },
  { value: 'BE', label: 'Belgium' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'HR', label: 'Croatia' },
  { value: 'CY', label: 'Cyprus' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'DK', label: 'Denmark' },
  { value: 'EE', label: 'Estonia' },
  { value: 'FI', label: 'Finland' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'GR', label: 'Greece' },
  { value: 'HU', label: 'Hungary' },
  { value: 'IE', label: 'Ireland' },
  { value: 'IT', label: 'Italy' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MT', label: 'Malta' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'RO', label: 'Romania' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'ES', label: 'Spain' },
  { value: 'SE', label: 'Sweden' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'NO', label: 'Norway' },
  { value: 'IS', label: 'Iceland' },
].sort((a, b) => a.label.localeCompare(b.label));

// The complete wizard schema
export const RISK_WIZARD: WizardSchema = {
  version: 'v1',
  title: 'Risk & Readiness Check',
  subtitle: 'A 3–4 minute check to help you prepare calmly and practically.',
  sections: [
    {
      id: 'location',
      title: 'Location & context',
      intro: 'We use your location only to tailor guidance — your answers stay private unless you choose to save.',
      steps: [
        {
          id: 'country_city_postal',
          type: 'location',
          required: true,
          title: 'Where are you based?',
          helper: 'This helps tailor your plan to local realities (services, density, logistics).',
          icon: 'MapPin',
          image: 'illustration-location',
          fields: [
            { key: 'country_code', label: 'Country', kind: 'select', required: true, options: 'COUNTRY_LIST' },
            { key: 'city', label: 'City', kind: 'text', required: true, placeholder: 'e.g., Eindhoven' },
            { key: 'postal_code', label: 'Postal code (optional)', kind: 'text', required: false, placeholder: 'e.g., 5611' }
          ],
          onAnswer: { callGeoRisk: true }
        },
        {
          id: 'home_type',
          type: 'single',
          required: true,
          title: 'What best describes your home?',
          helper: 'Different home types affect how you cope with disruptions (space, access, storage).',
          icon: 'Home',
          image: 'illustration-home',
          options: [
            { value: 'house', label: 'House' },
            { value: 'row_house', label: 'Row / townhouse' },
            { value: 'apartment', label: 'Apartment' },
            { value: 'room', label: 'Room / shared housing' }
          ]
        },
        {
          id: 'mobility_out',
          type: 'single',
          required: true,
          title: 'If you needed to relocate within 2 hours, how easy would it be?',
          helper: 'A simple mobility check — not about panic, just options.',
          icon: 'Route',
          image: 'illustration-mobility',
          options: [
            { value: 'easy', label: 'Easy (car/route ready)' },
            { value: 'maybe', label: 'Possible but depends' },
            { value: 'hard', label: 'Hard (limited options)' }
          ]
        }
      ]
    },
    {
      id: 'household',
      title: 'Household',
      intro: "We adjust recommendations based on who you're responsible for.",
      steps: [
        {
          id: 'household_size',
          type: 'single',
          required: true,
          title: 'How many people are in your household?',
          helper: 'More people usually means more water, food, and coordination.',
          icon: 'Users',
          image: 'illustration-household',
          options: [
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3_4', label: '3–4' },
            { value: '5_plus', label: '5+' }
          ]
        },
        {
          id: 'special_needs',
          type: 'multi',
          required: true,
          title: 'Any special needs to plan for?',
          helper: 'This helps tailor a calm plan and the right supplies.',
          icon: 'HeartPulse',
          image: 'illustration-care',
          options: [
            { value: 'none', label: 'None' },
            { value: 'child_under_5', label: 'Child under 5' },
            { value: 'elder_70_plus', label: 'Elder 70+' },
            { value: 'limited_mobility', label: 'Limited mobility' },
            { value: 'medical_dependency', label: 'Medical dependency (e.g., insulin/oxygen)' }
          ],
          multiBehavior: { noneExcludesOthers: true }
        },
        {
          id: 'pets',
          type: 'single',
          required: true,
          title: 'Do you have pets that would need to relocate with you?',
          helper: 'Pets add simple logistics — food, carriers, and documents.',
          icon: 'PawPrint',
          image: 'illustration-pets',
          options: [
            { value: 'no', label: 'No' },
            { value: 'yes_1', label: 'Yes (1)' },
            { value: 'yes_2_plus', label: 'Yes (2+)' }
          ]
        }
      ]
    },
    {
      id: 'preparedness',
      title: 'Preparedness',
      intro: 'Quick, practical checks for the next 72 hours.',
      steps: [
        {
          id: 'water_days',
          type: 'single',
          required: true,
          title: 'How many days of drinking water do you have at home?',
          helper: 'Water is the first bottleneck in most disruptions.',
          icon: 'Droplets',
          image: 'illustration-water',
          options: [
            { value: '0_1', label: '0–1 day' },
            { value: '2_3', label: '2–3 days' },
            { value: '4_7', label: '4–7 days' },
            { value: '7_plus', label: '7+ days' }
          ]
        },
        {
          id: 'food_days',
          type: 'single',
          required: true,
          title: 'How many days of non-perishable food do you have?',
          helper: 'Enough for the household without relying on stores.',
          icon: 'Utensils',
          image: 'illustration-food',
          options: [
            { value: '0_1', label: '0–1 day' },
            { value: '2_3', label: '2–3 days' },
            { value: '4_7', label: '4–7 days' },
            { value: '7_plus', label: '7+ days' }
          ]
        },
        {
          id: 'power_light',
          type: 'single',
          required: true,
          title: 'If power is out tonight, what do you have ready?',
          helper: 'Light + phone power + information are the essentials.',
          icon: 'BatteryCharging',
          image: 'illustration-power',
          options: [
            { value: 'none', label: 'Nothing ready' },
            { value: 'basic', label: 'Flashlight OR powerbank' },
            { value: 'good', label: 'Flashlight + powerbank (+ radio optional)' },
            { value: 'strong', label: 'Backup battery/UPS + full kit' }
          ]
        },
        {
          id: 'cash_buffer',
          type: 'single',
          required: true,
          title: 'If cards and networks fail, what cash buffer do you have?',
          helper: 'Cash helps with transport, essentials, and quick decisions.',
          icon: 'Wallet',
          image: 'illustration-cash',
          options: [
            { value: 'lt_50', label: 'Less than €50' },
            { value: '50_200', label: '€50–€200' },
            { value: '200_500', label: '€200–€500' },
            { value: '500_plus', label: '€500+' }
          ]
        },
        {
          id: 'docs_ready',
          type: 'single',
          required: true,
          title: 'Are your essential documents accessible and backed up?',
          helper: 'A calm, organized folder prevents unnecessary stress.',
          icon: 'FileText',
          image: 'illustration-docs',
          options: [
            { value: 'scattered', label: 'Scattered / not organized' },
            { value: 'somewhere', label: 'I have them but not ready' },
            { value: 'organized', label: 'Organized + phone photos' },
            { value: 'red_folder', label: 'Organized + backup + ready folder' }
          ]
        },
        {
          id: 'comms_offline',
          type: 'single',
          required: true,
          title: 'Can you receive information without internet?',
          helper: 'Offline information reduces uncertainty during disruptions.',
          icon: 'Radio',
          image: 'illustration-comms',
          options: [
            { value: 'no', label: 'No' },
            { value: 'phone_only', label: 'Phone only' },
            { value: 'powerbank', label: 'Powerbank + alerts' },
            { value: 'radio_plan', label: 'Radio + backup power + check-in plan' }
          ]
        },
        {
          id: 'plan_checkin',
          type: 'single',
          required: true,
          title: 'Do you have a simple plan (meeting point + check-in contact)?',
          helper: 'A tiny plan reduces panic and saves time.',
          icon: 'ClipboardList',
          image: 'illustration-plan',
          options: [
            { value: 'none', label: 'Not yet' },
            { value: 'contact_only', label: 'Contact only' },
            { value: 'basic_plan', label: 'Basic plan' },
            { value: 'complete', label: 'Complete + agreed with everyone' }
          ]
        },
        {
          id: 'kit_72h',
          type: 'single',
          required: true,
          title: 'Do you have a 72-hour kit ready to grab?',
          helper: 'Not tactical — just essentials for a calm first 3 days.',
          icon: 'Backpack',
          image: 'illustration-kit',
          options: [
            { value: 'no', label: 'No' },
            { value: 'partial', label: 'Partial' },
            { value: 'almost', label: 'Almost complete' },
            { value: 'complete', label: 'Complete + reviewed recently' }
          ]
        }
      ]
    }
  ]
};

// Helper to flatten steps for linear navigation
export function flattenSteps(schema: WizardSchema) {
  const steps: Array<{ sectionId: string; sectionTitle: string; step: WizardStep; sectionIntro?: string }> = [];
  
  schema.sections.forEach((section, sectionIndex) => {
    section.steps.forEach((step, stepIndex) => {
      steps.push({
        sectionId: section.id,
        sectionTitle: section.title,
        step,
        // Include section intro only for first step of each section
        sectionIntro: stepIndex === 0 ? section.intro : undefined
      });
    });
  });
  
  return steps;
}

// Get total step count
export function getTotalSteps(schema: WizardSchema) {
  return schema.sections.reduce((acc, section) => acc + section.steps.length, 0);
}
