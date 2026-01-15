/**
 * Vault 2.0 Types - Expanded data schema for comprehensive emergency data
 */

// === HOUSEHOLD MEMBER ===
export interface HouseholdMember {
  id: string;
  name: string;
  relationship: 'partner' | 'child' | 'parent' | 'sibling' | 'other';
  relationshipOther?: string;
  dob: string;
  bloodType: string;
  nationalId: string;
  passportNumber: string;
  specialNeeds: string;
}

// === IDs & DOCUMENTS (Expanded) ===
export interface IdsDataV2 {
  // Primary person
  fullName: string;
  dob: string;
  nationality: string;
  nationalId: string;
  nationalIdExpiry: string;
  passportNumber: string;
  passportExpiry: string;
  drivingLicense: string;
  drivingLicenseExpiry: string;
  taxId: string;
  address: string;
  
  // Household members
  householdMembers: HouseholdMember[];
  
  // Checklist
  copiesMade: boolean;
  storedInOnePlace: boolean;
  notes: string;
  
  // Schema version for migration
  _schemaVersion: 2;
}

// === EMERGENCY CONTACT (Expanded) ===
export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  address: string;
  hasKeyToHome: boolean;
  isICE: boolean; // In Case of Emergency - first to contact
}

// === SERVICE CONTACT ===
export interface ServiceContact {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

// === INSURANCE INFO ===
export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  phone: string;
  notes: string;
}

// === CONTACTS (Expanded) ===
export interface ContactsDataV2 {
  // Emergency contacts (order matters - first is primary)
  emergencyContacts: EmergencyContact[];
  
  // Important services
  familyDoctor: ServiceContact;
  pediatrician: ServiceContact;
  dentist: ServiceContact;
  vet: ServiceContact;
  
  // Insurance
  healthInsurance: InsuranceInfo;
  homeInsurance: InsuranceInfo;
  carInsurance: InsuranceInfo;
  lifeInsurance: InsuranceInfo;
  
  // Other important contacts
  lawyer: string;
  accountant: string;
  employer: string;
  
  _schemaVersion: 2;
}

// === MEDICATION ===
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  forMember: string; // household member name or "self"
}

// === MEDICAL (Expanded) ===
export interface MedicalDataV2 {
  // Primary person
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: Medication[];
  surgeries: string;
  
  // Critical info
  donorStatus: 'yes' | 'no' | 'unknown';
  advanceDirectives: string;
  powerOfAttorney: string;
  
  emergencyNotes: string;
  
  _schemaVersion: 2;
}

// === FINANCE (same as before, typed) ===
export interface FinanceDataV2 {
  banks: string;
  policyNumbers: string;
  emergencyCash: string;
  _schemaVersion: 2;
}

// === DEVICES (same as before, typed) ===
export interface DevicesDataV2 {
  phones: string;
  accounts: string;
  recoveryNotes: string;
  _schemaVersion: 2;
}

// === UNION TYPE ===
export type VaultSectionDataV2 = 
  | IdsDataV2 
  | ContactsDataV2 
  | MedicalDataV2 
  | FinanceDataV2 
  | DevicesDataV2;

// === STORAGE MODE ===
export type VaultStorageMode = 'device-only' | 'device-cloud';

// === VAULT PREFERENCES ===
export interface VaultPreferences {
  storageMode: VaultStorageMode;
  acknowledgedDataLossWarning: boolean;
  setupCompletedAt: string | null;
}

// === DEFAULT VALUES ===
export const DEFAULT_IDS_DATA: IdsDataV2 = {
  fullName: '',
  dob: '',
  nationality: '',
  nationalId: '',
  nationalIdExpiry: '',
  passportNumber: '',
  passportExpiry: '',
  drivingLicense: '',
  drivingLicenseExpiry: '',
  taxId: '',
  address: '',
  householdMembers: [],
  copiesMade: false,
  storedInOnePlace: false,
  notes: '',
  _schemaVersion: 2,
};

export const DEFAULT_SERVICE_CONTACT: ServiceContact = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

export const DEFAULT_INSURANCE_INFO: InsuranceInfo = {
  provider: '',
  policyNumber: '',
  phone: '',
  notes: '',
};

export const DEFAULT_CONTACTS_DATA: ContactsDataV2 = {
  emergencyContacts: [],
  familyDoctor: { ...DEFAULT_SERVICE_CONTACT },
  pediatrician: { ...DEFAULT_SERVICE_CONTACT },
  dentist: { ...DEFAULT_SERVICE_CONTACT },
  vet: { ...DEFAULT_SERVICE_CONTACT },
  healthInsurance: { ...DEFAULT_INSURANCE_INFO },
  homeInsurance: { ...DEFAULT_INSURANCE_INFO },
  carInsurance: { ...DEFAULT_INSURANCE_INFO },
  lifeInsurance: { ...DEFAULT_INSURANCE_INFO },
  lawyer: '',
  accountant: '',
  employer: '',
  _schemaVersion: 2,
};

export const DEFAULT_MEDICAL_DATA: MedicalDataV2 = {
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  currentMedications: [],
  surgeries: '',
  donorStatus: 'unknown',
  advanceDirectives: '',
  powerOfAttorney: '',
  emergencyNotes: '',
  _schemaVersion: 2,
};

export const DEFAULT_FINANCE_DATA: FinanceDataV2 = {
  banks: '',
  policyNumbers: '',
  emergencyCash: '',
  _schemaVersion: 2,
};

export const DEFAULT_DEVICES_DATA: DevicesDataV2 = {
  phones: '',
  accounts: '',
  recoveryNotes: '',
  _schemaVersion: 2,
};

// === MIGRATION HELPERS ===
export function isV2Data(data: unknown): boolean {
  return typeof data === 'object' && data !== null && '_schemaVersion' in data && (data as { _schemaVersion: number })._schemaVersion === 2;
}

// Generate unique ID for array items
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
