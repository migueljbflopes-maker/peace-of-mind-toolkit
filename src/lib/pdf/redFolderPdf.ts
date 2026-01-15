/**
 * Red Folder PDF Generator
 * 
 * SECURITY:
 * - PDF generation happens entirely client-side
 * - No plaintext data is ever sent to servers
 * - Uses decrypted data from vault session
 */

import jsPDF from 'jspdf';
import { Locale } from '@/i18n/translations';
import { GeneratedPlanA, GeneratedPlanB } from '@/lib/planWizard2Types';

// Types for PDF data
export interface RiskData {
  score: number | null;
  riskLevel: string | null;
  breakdown: Record<string, number>;
  city?: string;
  country?: string;
  updatedAt: string;
}

export interface SuppliesData {
  days: number;
  preparednessPercent: number | null;
  plan: Record<string, unknown>;
  updatedAt: string;
}

export interface VaultContactData {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

// Emergency Contact V2
export interface VaultEmergencyContact {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  hasKeyToHome?: boolean;
  isICE?: boolean;
}

// Household Member V2
export interface VaultHouseholdMember {
  id?: string;
  name: string;
  relationship: string;
  relationshipOther?: string;
  dob?: string;
  bloodType?: string;
  nationalId?: string;
  passportNumber?: string;
  specialNeeds?: string;
}

// Medication V2
export interface VaultMedication {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  prescriber?: string;
  forMember?: string;
}

// Pet V2
export interface VaultPet {
  id?: string;
  name: string;
  species: string;
  breed?: string;
  color?: string;
  microchipId?: string;
  vetName?: string;
  vetPhone?: string;
  medications?: string;
  specialNeeds?: string;
}

// Vehicle V2
export interface VaultVehicle {
  id?: string;
  type: string;
  make: string;
  model: string;
  year?: string;
  licensePlate: string;
  vin?: string;
  insurancePolicy?: string;
  notes?: string;
}

// Service Contact V2
export interface VaultServiceContact {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// Insurance Info V2
export interface VaultInsuranceInfo {
  provider?: string;
  policyNumber?: string;
  phone?: string;
  notes?: string;
}

export interface VaultSectionData {
  ids?: {
    // Primary person (V1 & V2)
    fullName?: string;
    address?: string;
    nationalId?: string;
    nationalIdExpiry?: string;
    passportNumber?: string;
    passportExpiry?: string;
    drivingLicense?: string;
    drivingLicenseExpiry?: string;
    taxId?: string;
    nationality?: string;
    dob?: string;
    notes?: string;
    // V2 only
    householdMembers?: VaultHouseholdMember[];
    copiesMade?: boolean;
    storedInOnePlace?: boolean;
    _schemaVersion?: number;
  };
  contacts?: {
    // V1 compatibility
    primary?: VaultContactData[];
    doctor?: string;
    vet?: string;
    insurance?: string;
    importantServices?: string;
    // V2 structure
    emergencyContacts?: VaultEmergencyContact[];
    familyDoctor?: VaultServiceContact;
    pediatrician?: VaultServiceContact;
    dentist?: VaultServiceContact;
    healthInsurance?: VaultInsuranceInfo;
    homeInsurance?: VaultInsuranceInfo;
    carInsurance?: VaultInsuranceInfo;
    lifeInsurance?: VaultInsuranceInfo;
    lawyer?: string;
    accountant?: string;
    employer?: string;
    _schemaVersion?: number;
  };
  medical?: {
    // V1 & V2
    allergies?: string;
    medications?: string;
    conditions?: string;
    emergencyNotes?: string;
    // V2 only
    bloodType?: string;
    chronicConditions?: string;
    currentMedications?: VaultMedication[];
    surgeries?: string;
    donorStatus?: string;
    advanceDirectives?: string;
    powerOfAttorney?: string;
    _schemaVersion?: number;
  };
  finance?: {
    banks?: string;
    policyNumbers?: string;
    emergencyCash?: string;
    _schemaVersion?: number;
  };
  devices?: {
    phones?: string;
    accounts?: string;
    recoveryNotes?: string;
    _schemaVersion?: number;
  };
  pets?: {
    pets?: VaultPet[];
    petInsurance?: VaultInsuranceInfo;
    evacuationPlan?: string;
    emergencyCaretaker?: string;
    _schemaVersion?: number;
  };
  property?: {
    address?: string;
    propertyType?: string;
    ownershipType?: string;
    electricityProvider?: string;
    gasProvider?: string;
    waterProvider?: string;
    internetProvider?: string;
    mainShutoffLocations?: string;
    alarmCode?: string;
    safeLocation?: string;
    safeCode?: string;
    valuableItems?: string;
    importantDocumentsLocation?: string;
    vehicles?: VaultVehicle[];
    _schemaVersion?: number;
  };
}

export interface RedFolderPdfData {
  locale: Locale;
  risk: RiskData | null;
  supplies: SuppliesData | null;
  vault: VaultSectionData;
  planA: GeneratedPlanA | null;
  planB: GeneratedPlanB | null;
  generatedAt: string;
}

export interface PdfOptions {
  includeFullVault?: boolean;
  outputType?: 'blob' | 'dataurl';
}

// Color palette (RGB values)
const COLORS = {
  primary: { r: 220, g: 38, b: 38 },      // Red
  primaryLight: { r: 254, g: 242, b: 242 }, // Light red bg
  secondary: { r: 245, g: 158, b: 11 },    // Amber
  secondaryLight: { r: 255, g: 251, b: 235 }, // Light amber bg
  text: { r: 15, g: 23, b: 42 },           // Slate-900
  textMuted: { r: 100, g: 116, b: 139 },   // Slate-500
  border: { r: 226, g: 232, b: 240 },      // Slate-200
  success: { r: 34, g: 197, b: 94 },       // Green
  white: { r: 255, g: 255, b: 255 },
  background: { r: 248, g: 250, b: 252 },  // Slate-50
};

// PDF labels by locale
const labels = {
  en: {
    title: 'EMERGENCY RED FOLDER',
    subtitle: 'Personalized Resiliency Plan',
    generated: 'Generated',
    disclaimer: 'This document is for personal preparedness purposes only. Always follow official guidance from local authorities during emergencies.',
    page: 'Page',
    confidential: 'CONFIDENTIAL - Keep in a safe place',
    // Cover
    coverSummary: 'Summary Overview',
    riskLevel: 'Risk Level',
    location: 'Location',
    topPriorities: 'Top Priority Areas',
    notProvided: 'Not provided',
    noAssessment: 'No risk assessment saved',
    // Essentials
    essentialsChecklist: '14-Day Essentials Checklist',
    preparedness: 'Preparedness Score',
    grabAndGo: 'Grab-and-Go Kit Essentials',
    noSuppliesPlan: 'No supplies plan saved',
    category: 'Category',
    items: 'Items',
    // Contacts
    contactsMedical: 'Emergency Contacts & Medical',
    emergencyContacts: 'Emergency Contacts',
    medicalInfo: 'Medical Information',
    allergies: 'Allergies',
    medications: 'Current Medications',
    conditions: 'Medical Conditions',
    notes: 'Emergency Notes',
    personalInfo: 'Personal Information',
    name: 'Name',
    address: 'Address',
    dob: 'Date of Birth',
    idNumber: 'ID/Passport',
    bloodType: 'Blood Type',
    householdMembers: 'Household Members',
    // Plans
    plansTitle: 'Emergency Plans A & B',
    planA: 'PLAN A — Shelter in Place',
    planB: 'PLAN B — Evacuate / Relocate',
    triggers: 'When to Activate',
    firstHour: 'First Hour Actions',
    first24h: 'First 24 Hours',
    firstWeek: 'Extended Period',
    routes: 'Evacuation Routes',
    primaryRoute: 'Primary Route',
    altRoute1: 'Alternative 1',
    altRoute2: 'Alternative 2',
    destinations: 'Safe Destinations',
    noGoZones: 'Areas to Avoid',
    meetingPoints: 'Family Meeting Points',
    commsPlan: 'Communication Plan',
    noPlan: 'No plan saved',
    overview: 'Overview',
    // Financial
    financialInfo: 'Financial Reference',
    banks: 'Banks',
    insurance: 'Insurance Policies',
    emergencyCash: 'Emergency Cash',
    // Pets
    petsSection: 'Pets & Animals',
    petName: 'Pet Name',
    species: 'Species',
    breed: 'Breed',
    microchip: 'Microchip ID',
    vetContact: 'Veterinarian',
    evacuationPlan: 'Evacuation Plan',
    emergencyCaretaker: 'Emergency Caretaker',
    petInsurance: 'Pet Insurance',
    specialNeeds: 'Special Needs',
    // Property
    propertySection: 'Property & Vehicles',
    propertyType: 'Property Type',
    shutoffLocations: 'Main Shutoff Locations',
    alarmCode: 'Alarm Code',
    safeLocation: 'Safe Location',
    documentsLocation: 'Important Documents Location',
    vehicles: 'Vehicles',
    utilities: 'Utilities',
  },
  pt: {
    title: 'RED FOLDER DE EMERGÊNCIA',
    subtitle: 'Plano de Resiliência Personalizado',
    generated: 'Gerado em',
    disclaimer: 'Este documento é apenas para preparação pessoal. Siga sempre as orientações oficiais das autoridades locais durante emergências.',
    page: 'Página',
    confidential: 'CONFIDENCIAL - Guardar em local seguro',
    // Cover
    coverSummary: 'Resumo Geral',
    riskLevel: 'Nível de Risco',
    location: 'Localização',
    topPriorities: 'Áreas Prioritárias',
    notProvided: 'Não fornecido',
    noAssessment: 'Sem avaliação de risco guardada',
    // Essentials
    essentialsChecklist: 'Lista de Essenciais 14 Dias',
    preparedness: 'Nível de Preparação',
    grabAndGo: 'Kit de Emergência',
    noSuppliesPlan: 'Sem plano de suprimentos guardado',
    category: 'Categoria',
    items: 'Itens',
    // Contacts
    contactsMedical: 'Contactos de Emergência & Médicos',
    emergencyContacts: 'Contactos de Emergência',
    medicalInfo: 'Informação Médica',
    allergies: 'Alergias',
    medications: 'Medicações Atuais',
    conditions: 'Condições Médicas',
    notes: 'Notas de Emergência',
    personalInfo: 'Informação Pessoal',
    name: 'Nome',
    address: 'Morada',
    dob: 'Data de Nascimento',
    idNumber: 'BI/Passaporte',
    bloodType: 'Tipo de Sangue',
    householdMembers: 'Membros do Agregado',
    // Plans
    plansTitle: 'Planos de Emergência A & B',
    planA: 'PLANO A — Permanecer em Casa',
    planB: 'PLANO B — Evacuar / Relocalizar',
    triggers: 'Quando Ativar',
    firstHour: 'Ações da Primeira Hora',
    first24h: 'Primeiras 24 Horas',
    firstWeek: 'Período Prolongado',
    routes: 'Rotas de Evacuação',
    primaryRoute: 'Rota Principal',
    altRoute1: 'Alternativa 1',
    altRoute2: 'Alternativa 2',
    destinations: 'Destinos Seguros',
    noGoZones: 'Zonas a Evitar',
    meetingPoints: 'Pontos de Encontro Familiar',
    commsPlan: 'Plano de Comunicação',
    noPlan: 'Sem plano guardado',
    overview: 'Resumo',
    // Financial
    financialInfo: 'Referência Financeira',
    banks: 'Bancos',
    insurance: 'Apólices de Seguro',
    emergencyCash: 'Dinheiro de Emergência',
    // Pets
    petsSection: 'Animais de Estimação',
    petName: 'Nome do Animal',
    species: 'Espécie',
    breed: 'Raça',
    microchip: 'Chip ID',
    vetContact: 'Veterinário',
    evacuationPlan: 'Plano de Evacuação',
    emergencyCaretaker: 'Cuidador de Emergência',
    petInsurance: 'Seguro de Animais',
    specialNeeds: 'Necessidades Especiais',
    // Property
    propertySection: 'Propriedade & Veículos',
    propertyType: 'Tipo de Propriedade',
    shutoffLocations: 'Localizações de Corte',
    alarmCode: 'Código de Alarme',
    safeLocation: 'Localização do Cofre',
    documentsLocation: 'Localização de Documentos',
    vehicles: 'Veículos',
    utilities: 'Serviços',
  },
};

// Risk level translations and colors
const riskLevelConfig = {
  en: { 
    low: { label: 'Low Risk', color: COLORS.success },
    medium: { label: 'Medium Risk', color: COLORS.secondary },
    high: { label: 'High Risk', color: COLORS.primary },
  },
  pt: { 
    low: { label: 'Risco Baixo', color: COLORS.success },
    medium: { label: 'Risco Médio', color: COLORS.secondary },
    high: { label: 'Risco Alto', color: COLORS.primary },
  },
};

// Format date by locale
function formatDate(dateStr: string, locale: Locale): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Build the PDF - returns blob by default, or data URL string if specified
export async function buildRedFolderPdf(
  data: RedFolderPdfData, 
  options: PdfOptions = {}
): Promise<Blob | string> {
  const { locale, risk, supplies, vault, planA, planB, generatedAt } = data;
  const { includeFullVault = false } = options;
  const l = labels[locale];
  const riskConfig = riskLevelConfig[locale];
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;
  let currentPage = 1;

  // ==================== HELPER FUNCTIONS ====================

  const setColor = (color: { r: number; g: number; b: number }) => {
    doc.setTextColor(color.r, color.g, color.b);
  };

  const setFillColor = (color: { r: number; g: number; b: number }) => {
    doc.setFillColor(color.r, color.g, color.b);
  };

  const setDrawColor = (color: { r: number; g: number; b: number }) => {
    doc.setDrawColor(color.r, color.g, color.b);
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    // Footer line
    setDrawColor(COLORS.border);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Page number
    doc.setFontSize(8);
    setColor(COLORS.textMuted);
    doc.text(`${l.page} ${pageNum} / ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    
    // Confidential note
    doc.text(l.confidential, margin, pageHeight - 10);
  };

  const addSectionHeader = (text: string, iconColor = COLORS.primary) => {
    // Colored bar
    setFillColor(iconColor);
    doc.rect(margin, y, contentWidth, 8, 'F');
    
    // Text on bar
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.white);
    doc.text(text.toUpperCase(), margin + 4, y + 5.5);
    
    y += 12;
    setColor(COLORS.text);
  };

  const addSubsectionHeader = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.text);
    doc.text(text, margin, y);
    y += 6;
  };

  const addText = (text: string, indent: number = 0, bold = false) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    setColor(COLORS.text);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 4.5;
  };

  const addLabelValue = (label: string, value: string | undefined, indent: number = 0) => {
    if (!value) return;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.textMuted);
    doc.text(`${label}:`, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.text);
    const labelWidth = doc.getTextWidth(`${label}: `);
    const valueLines = doc.splitTextToSize(value, contentWidth - indent - labelWidth - 2);
    doc.text(valueLines, margin + indent + labelWidth + 1, y);
    y += valueLines.length * 4.5;
  };

  const addBullet = (text: string, indent: number = 0) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.text);
    doc.text('•', margin + indent, y);
    const lines = doc.splitTextToSize(text, contentWidth - indent - 6);
    doc.text(lines, margin + indent + 4, y);
    y += lines.length * 4.5;
  };

  const addNumberedItem = (num: number, text: string, indent: number = 0) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.primary);
    doc.text(`${num}.`, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    setColor(COLORS.text);
    const lines = doc.splitTextToSize(text, contentWidth - indent - 8);
    doc.text(lines, margin + indent + 6, y);
    y += lines.length * 4.5;
  };

  const addSpacer = (height: number = 4) => {
    y += height;
  };

  const addDivider = () => {
    setDrawColor(COLORS.border);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  const checkPageBreak = (needed: number = 25): boolean => {
    if (y + needed > pageHeight - 20) {
      addFooter(currentPage, 5);
      doc.addPage();
      currentPage++;
      y = margin;
      return true;
    }
    return false;
  };

  const addInfoBox = (content: string[], bgColor = COLORS.background) => {
    const boxHeight = content.length * 5 + 6;
    setFillColor(bgColor);
    setDrawColor(COLORS.border);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
    y += 4;
    content.forEach(line => {
      doc.setFontSize(9);
      setColor(COLORS.text);
      doc.text(line, margin + 4, y);
      y += 5;
    });
    y += 2;
  };

  // ==================== PAGE 1: COVER ====================

  // Red header band
  setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setColor(COLORS.white);
  doc.text(l.title, pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(l.subtitle, pageWidth / 2, 32, { align: 'center' });

  y = 55;

  // Generated date box
  setFillColor(COLORS.background);
  setDrawColor(COLORS.border);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
  doc.setFontSize(10);
  setColor(COLORS.text);
  doc.text(`${l.generated}: ${formatDate(generatedAt, locale)}`, pageWidth / 2, y + 7.5, { align: 'center' });
  y += 20;

  // Risk Summary Section
  addSectionHeader(l.coverSummary, COLORS.primary);

  if (risk) {
    const levelKey = (risk.riskLevel || 'medium').toLowerCase() as 'low' | 'medium' | 'high';
    const levelConfig = riskConfig[levelKey] || riskConfig.medium;
    
    // Risk level badge
    setFillColor(levelConfig.color);
    doc.roundedRect(margin, y, 50, 10, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.white);
    doc.text(levelConfig.label, margin + 25, y + 6.5, { align: 'center' });
    
    // Score
    setColor(COLORS.text);
    doc.text(`Score: ${risk.score || 0}/100`, margin + 60, y + 6.5);
    
    y += 14;

    // Location
    if (risk.city || risk.country) {
      addLabelValue(l.location, `${risk.city || ''}${risk.city && risk.country ? ', ' : ''}${risk.country || ''}`);
    }
    addSpacer(4);

    // Top priorities
    addSubsectionHeader(l.topPriorities);
    const breakdownItems = Object.entries(risk.breakdown || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 4);

    if (breakdownItems.length > 0) {
      breakdownItems.forEach(([key, value], idx) => {
        addNumberedItem(idx + 1, `${key}: ${value}%`);
      });
    } else {
      addText(l.notProvided);
    }
  } else {
    addText(l.noAssessment);
  }

  addSpacer(8);

  // Personal Info (if includeFullVault)
  if (includeFullVault && vault.ids) {
    addSectionHeader(l.personalInfo, COLORS.secondary);
    if (vault.ids.fullName) addLabelValue(l.name, vault.ids.fullName);
    if (vault.ids.address) addLabelValue(l.address, vault.ids.address);
    if (vault.ids.dob) addLabelValue(l.dob, vault.ids.dob);
    if (vault.ids.nationalId) addLabelValue(l.idNumber, vault.ids.nationalId);
    addSpacer(4);
  }

  // Disclaimer
  y = pageHeight - 35;
  setFillColor(COLORS.primaryLight);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setFontSize(8);
  setColor(COLORS.textMuted);
  const disclaimerLines = doc.splitTextToSize(l.disclaimer, contentWidth - 8);
  doc.text(disclaimerLines, margin + 4, y + 6);

  addFooter(1, 5);

  // ==================== PAGE 2: CONTACTS & MEDICAL ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addSectionHeader(l.emergencyContacts, COLORS.primary);

  // Support both V1 (primary) and V2 (emergencyContacts) formats
  const v1Contacts = vault.contacts?.primary || [];
  const v2Contacts = vault.contacts?.emergencyContacts || [];
  const hasContacts = v1Contacts.length > 0 || v2Contacts.length > 0;
  
  if (hasContacts) {
    // Table header
    setFillColor(COLORS.background);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.textMuted);
    doc.text('NAME', margin + 2, y + 4.5);
    doc.text('RELATIONSHIP', margin + 50, y + 4.5);
    doc.text('PHONE', margin + 100, y + 4.5);
    if (includeFullVault) doc.text('EMAIL', margin + 140, y + 4.5);
    y += 8;

    // Use V2 contacts if available, otherwise V1
    const contactsToRender = v2Contacts.length > 0 
      ? v2Contacts.map(c => ({ name: c.name, relationship: c.relationship, phone: c.phone, email: c.email }))
      : v1Contacts;

    // Table rows
    contactsToRender.slice(0, 8).forEach((contact, idx) => {
      const rowY = y;
      if (idx % 2 === 1) {
        setFillColor(COLORS.background);
        doc.rect(margin, rowY - 1, contentWidth, 6, 'F');
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(COLORS.text);
      doc.text(contact.name || '-', margin + 2, rowY + 3);
      doc.text(contact.relationship || '-', margin + 50, rowY + 3);
      doc.text(contact.phone || '-', margin + 100, rowY + 3);
      if (includeFullVault && contact.email) {
        doc.text(contact.email, margin + 140, rowY + 3);
      }
      y += 6;
    });
  } else {
    addText(l.notProvided);
  }

  // Additional contacts (V1 format or V2 service contacts)
  addSpacer(6);
  
  // V2 service contacts
  if (vault.contacts?.familyDoctor?.name) {
    addBullet(`${locale === 'pt' ? 'Médico' : 'Doctor'}: ${vault.contacts.familyDoctor.name}${vault.contacts.familyDoctor.phone ? ` - ${vault.contacts.familyDoctor.phone}` : ''}`);
  } else if (vault.contacts?.doctor) {
    addBullet(`Doctor: ${vault.contacts.doctor}`);
  }
  
  // Vet - check V2 vet service contact first
  const vetInfo = vault.contacts?.vet as VaultServiceContact | string | undefined;
  if (typeof vetInfo === 'object' && vetInfo?.name) {
    addBullet(`Vet: ${vetInfo.name}${vetInfo.phone ? ` - ${vetInfo.phone}` : ''}`);
  } else if (typeof vetInfo === 'string' && vetInfo) {
    addBullet(`Vet: ${vetInfo}`);
  }
  
  // Insurance info - V2 or V1
  if (vault.contacts?.healthInsurance?.provider) {
    addBullet(`${locale === 'pt' ? 'Seguro Saúde' : 'Health Insurance'}: ${vault.contacts.healthInsurance.provider}${vault.contacts.healthInsurance.policyNumber ? ` - ${vault.contacts.healthInsurance.policyNumber}` : ''}`);
  } else if (vault.contacts?.insurance) {
    addBullet(`Insurance: ${vault.contacts.insurance}`);
  }
  
  if (vault.contacts?.importantServices) addBullet(`Services: ${vault.contacts.importantServices}`);

  addSpacer(8);
  addDivider();
  addSpacer(4);

  // Medical Section
  addSectionHeader(l.medicalInfo, COLORS.primary);

  // Check for V1 or V2 medical data
  const hasMedical = vault.medical?.allergies || vault.medical?.medications || 
                     vault.medical?.conditions || vault.medical?.emergencyNotes ||
                     vault.medical?.bloodType || vault.medical?.chronicConditions ||
                     (vault.medical?.currentMedications && vault.medical.currentMedications.length > 0);

  if (hasMedical) {
    // Two-column layout for medical
    const colWidth = contentWidth / 2 - 4;
    const startY = y;

    // Left column
    // Blood type (V2)
    if (vault.medical?.bloodType) {
      addLabelValue(l.bloodType, vault.medical.bloodType);
      addSpacer(2);
    }
    
    if (vault.medical?.allergies) {
      addSubsectionHeader(l.allergies);
      addText(vault.medical.allergies, 2);
      addSpacer(4);
    }
    
    // Conditions - V2 chronicConditions or V1 conditions
    const conditionsText = vault.medical?.chronicConditions || vault.medical?.conditions;
    if (conditionsText) {
      addSubsectionHeader(l.conditions);
      addText(conditionsText, 2);
    }

    const leftEndY = y;

    // Right column
    y = startY;
    const rightStart = margin + colWidth + 8;

    // Medications - V2 currentMedications array or V1 medications string
    if (vault.medical?.currentMedications && vault.medical.currentMedications.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      setColor(COLORS.text);
      doc.text(l.medications, rightStart, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      vault.medical.currentMedications.slice(0, 6).forEach(med => {
        setColor(COLORS.text);
        const medText = `• ${med.name}${med.dosage ? ` (${med.dosage})` : ''}${med.frequency ? ` - ${med.frequency}` : ''}`;
        doc.text(medText, rightStart + 2, y);
        y += 4.5;
      });
      y += 2;
    } else if (vault.medical?.medications) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      setColor(COLORS.text);
      doc.text(l.medications, rightStart, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const medLines = doc.splitTextToSize(vault.medical.medications, colWidth - 4);
      doc.text(medLines, rightStart + 2, y);
      y += medLines.length * 4.5 + 4;
    }

    y = Math.max(y, leftEndY);

    if (vault.medical?.emergencyNotes) {
      addSpacer(4);
      addSubsectionHeader(l.notes);
      setFillColor(COLORS.secondaryLight);
      const noteLines = doc.splitTextToSize(vault.medical.emergencyNotes, contentWidth - 8);
      const boxH = noteLines.length * 4.5 + 6;
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F');
      doc.setFontSize(9);
      setColor(COLORS.text);
      doc.text(noteLines, margin + 4, y + 5);
      y += boxH + 4;
    }
  } else {
    addText(l.notProvided);
  }

  // Financial info if full vault
  if (includeFullVault && vault.finance) {
    checkPageBreak(40);
    addSpacer(8);
    addDivider();
    addSpacer(4);
    addSectionHeader(l.financialInfo, COLORS.secondary);
    if (vault.finance.banks) addLabelValue(l.banks, vault.finance.banks);
    if (vault.finance.policyNumbers) addLabelValue(l.insurance, vault.finance.policyNumbers);
    if (vault.finance.emergencyCash) addLabelValue(l.emergencyCash, vault.finance.emergencyCash);
  }

  // Pets section if full vault
  if (includeFullVault && vault.pets) {
    const hasPetsData = (vault.pets.pets && vault.pets.pets.length > 0) || 
                        vault.pets.evacuationPlan || 
                        vault.pets.emergencyCaretaker;
    
    if (hasPetsData) {
      checkPageBreak(50);
      addSpacer(8);
      addDivider();
      addSpacer(4);
      addSectionHeader(l.petsSection, COLORS.secondary);
      
      // Pet table
      if (vault.pets.pets && vault.pets.pets.length > 0) {
        // Table header
        setFillColor(COLORS.background);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        setColor(COLORS.textMuted);
        doc.text(l.petName.toUpperCase(), margin + 2, y + 4.5);
        doc.text(l.species.toUpperCase(), margin + 45, y + 4.5);
        doc.text(l.microchip.toUpperCase(), margin + 85, y + 4.5);
        doc.text(l.vetContact.toUpperCase(), margin + 130, y + 4.5);
        y += 8;

        // Table rows
        vault.pets.pets.slice(0, 6).forEach((pet, idx) => {
          const rowY = y;
          if (idx % 2 === 1) {
            setFillColor(COLORS.background);
            doc.rect(margin, rowY - 1, contentWidth, 6, 'F');
          }
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          setColor(COLORS.text);
          doc.text(pet.name || '-', margin + 2, rowY + 3);
          doc.text(`${pet.species || ''}${pet.breed ? ` (${pet.breed})` : ''}` || '-', margin + 45, rowY + 3);
          doc.text(pet.microchipId || '-', margin + 85, rowY + 3);
          doc.text(pet.vetName || '-', margin + 130, rowY + 3);
          y += 6;
        });
        
        addSpacer(4);
      }
      
      // Evacuation plan & caretaker
      if (vault.pets.evacuationPlan) {
        addLabelValue(l.evacuationPlan, vault.pets.evacuationPlan);
      }
      if (vault.pets.emergencyCaretaker) {
        addLabelValue(l.emergencyCaretaker, vault.pets.emergencyCaretaker);
      }
      if (vault.pets.petInsurance?.provider) {
        addLabelValue(l.petInsurance, `${vault.pets.petInsurance.provider} - ${vault.pets.petInsurance.policyNumber || ''}`);
      }
    }
  }

  // Property section if full vault
  if (includeFullVault && vault.property) {
    const hasPropertyData = vault.property.address || 
                            vault.property.mainShutoffLocations || 
                            vault.property.alarmCode ||
                            (vault.property.vehicles && vault.property.vehicles.length > 0);
    
    if (hasPropertyData) {
      checkPageBreak(50);
      addSpacer(8);
      addDivider();
      addSpacer(4);
      addSectionHeader(l.propertySection, COLORS.secondary);
      
      // Property info
      if (vault.property.address) {
        addLabelValue(l.address, vault.property.address);
      }
      if (vault.property.propertyType) {
        addLabelValue(l.propertyType, vault.property.propertyType);
      }
      if (vault.property.mainShutoffLocations) {
        addLabelValue(l.shutoffLocations, vault.property.mainShutoffLocations);
      }
      if (vault.property.alarmCode) {
        addLabelValue(l.alarmCode, vault.property.alarmCode);
      }
      if (vault.property.safeLocation) {
        addLabelValue(l.safeLocation, vault.property.safeLocation);
      }
      if (vault.property.importantDocumentsLocation) {
        addLabelValue(l.documentsLocation, vault.property.importantDocumentsLocation);
      }
      
      // Utilities
      const utilities = [
        vault.property.electricityProvider,
        vault.property.gasProvider,
        vault.property.waterProvider,
        vault.property.internetProvider
      ].filter(Boolean);
      
      if (utilities.length > 0) {
        addSpacer(4);
        addLabelValue(l.utilities, utilities.join(' | '));
      }
      
      // Vehicles table
      if (vault.property.vehicles && vault.property.vehicles.length > 0) {
        addSpacer(6);
        addSubsectionHeader(l.vehicles);
        
        // Table header
        setFillColor(COLORS.background);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        setColor(COLORS.textMuted);
        doc.text('TYPE', margin + 2, y + 4.5);
        doc.text('MAKE/MODEL', margin + 30, y + 4.5);
        doc.text('LICENSE PLATE', margin + 100, y + 4.5);
        doc.text('VIN', margin + 145, y + 4.5);
        y += 8;

        // Table rows
        vault.property.vehicles.slice(0, 4).forEach((vehicle, idx) => {
          const rowY = y;
          if (idx % 2 === 1) {
            setFillColor(COLORS.background);
            doc.rect(margin, rowY - 1, contentWidth, 6, 'F');
          }
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          setColor(COLORS.text);
          doc.text(vehicle.type || '-', margin + 2, rowY + 3);
          doc.text(`${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '-', margin + 30, rowY + 3);
          doc.text(vehicle.licensePlate || '-', margin + 100, rowY + 3);
          doc.text(vehicle.vin || '-', margin + 145, rowY + 3);
          y += 6;
        });
      }
    }
  }

  addFooter(2, 5);

  // ==================== PAGE 3: SUPPLIES ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addSectionHeader(l.essentialsChecklist, COLORS.secondary);

  if (supplies) {
    // Preparedness score badge
    const pct = supplies.preparednessPercent || 0;
    const scoreColor = pct >= 70 ? COLORS.success : pct >= 40 ? COLORS.secondary : COLORS.primary;
    
    setFillColor(scoreColor);
    doc.roundedRect(margin, y, 45, 12, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    setColor(COLORS.white);
    doc.text(`${pct}%`, margin + 22.5, y + 8, { align: 'center' });
    
    doc.setFontSize(10);
    setColor(COLORS.text);
    doc.text(l.preparedness, margin + 52, y + 8);
    
    y += 18;

    // Categories
    const plan = supplies.plan as Record<string, { items?: Array<{ name: string; quantity?: number; unit?: string }> }>;
    const categories = Object.entries(plan || {}).slice(0, 10);

    if (categories.length > 0) {
      // Two-column layout
      const colWidth = contentWidth / 2 - 4;
      let leftY = y;
      let rightY = y;
      const rightX = margin + colWidth + 8;

      categories.forEach(([category, data], idx) => {
        const items = data?.items || [];
        const isLeft = idx % 2 === 0;
        const currentX = isLeft ? margin : rightX;
        const currentY = isLeft ? leftY : rightY;

        // Category header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        setColor(COLORS.text);
        doc.text(category.toUpperCase(), currentX, currentY);
        
        let itemY = currentY + 5;
        items.slice(0, 5).forEach(item => {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          setColor(COLORS.textMuted);
          doc.text('☐', currentX, itemY);
          setColor(COLORS.text);
          const itemText = `${item.name}${item.quantity ? ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})` : ''}`;
          doc.text(itemText, currentX + 5, itemY);
          itemY += 4;
        });

        if (isLeft) {
          leftY = itemY + 4;
        } else {
          rightY = itemY + 4;
        }
      });

      y = Math.max(leftY, rightY) + 4;
    }

    // Grab-and-go section
    checkPageBreak(40);
    addSpacer(6);
    addDivider();
    addSpacer(4);
    addSubsectionHeader(l.grabAndGo);
    
    const essentials = locale === 'pt' 
      ? ['Água (3L/pessoa)', 'Kit primeiros socorros', 'Lanterna + pilhas', 'Documentos importantes', 'Dinheiro (notas pequenas)', 'Carregador telemóvel', 'Medicamentos essenciais', 'Muda de roupa']
      : ['Water (3L/person)', 'First aid kit', 'Flashlight + batteries', 'Important documents', 'Cash (small bills)', 'Phone charger', 'Essential medications', 'Change of clothes'];
    
    // Checklist grid
    const checkColWidth = contentWidth / 2 - 2;
    essentials.forEach((item, idx) => {
      const isLeft = idx % 2 === 0;
      const xPos = isLeft ? margin : margin + checkColWidth + 4;
      if (isLeft && idx > 0) y += 5;
      doc.setFontSize(9);
      setColor(COLORS.textMuted);
      doc.text('☐', xPos, y);
      setColor(COLORS.text);
      doc.text(item, xPos + 5, y);
    });
    y += 8;
  } else {
    addText(l.noSuppliesPlan);
  }

  addFooter(3, 5);

  // ==================== PAGE 4: PLAN A ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addSectionHeader(l.planA, COLORS.success);

  if (planA) {
    // Overview box
    if (planA.overview) {
      setFillColor(COLORS.background);
      const overviewLines = doc.splitTextToSize(planA.overview, contentWidth - 8);
      const boxH = overviewLines.length * 4.5 + 6;
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F');
      doc.setFontSize(9);
      setColor(COLORS.text);
      doc.text(overviewLines, margin + 4, y + 5);
      y += boxH + 6;
    }

    // Triggers
    if (planA.triggers.length > 0) {
      addSubsectionHeader(l.triggers);
      planA.triggers.slice(0, 4).forEach(trigger => addBullet(trigger, 2));
      addSpacer(6);
    }

    // Timeline sections
    const addTimelineSection = (title: string, items: string[]) => {
      if (items.length === 0) return;
      checkPageBreak(25);
      addSubsectionHeader(title);
      items.slice(0, 5).forEach((item, idx) => addNumberedItem(idx + 1, item, 2));
      addSpacer(4);
    };

    addTimelineSection(l.firstHour, planA.first_hour);
    addTimelineSection(l.first24h, planA.first_24h);
    addTimelineSection(l.firstWeek, planA.first_week);

    // Meeting points
    if (planA.meetup_points?.primary) {
      checkPageBreak(20);
      addSubsectionHeader(l.meetingPoints);
      addBullet(`Primary: ${planA.meetup_points.primary}`, 2);
      if (planA.meetup_points.secondary) {
        addBullet(`Secondary: ${planA.meetup_points.secondary}`, 2);
      }
      addSpacer(4);
    }

    // Comms plan
    if (planA.comms_plan) {
      checkPageBreak(20);
      addSubsectionHeader(l.commsPlan);
      addText(planA.comms_plan, 2);
    }
  } else {
    addText(l.noPlan);
  }

  addFooter(4, 5);

  // ==================== PAGE 5: PLAN B ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addSectionHeader(l.planB, COLORS.primary);

  if (planB) {
    // Overview box
    if (planB.overview) {
      setFillColor(COLORS.primaryLight);
      const overviewLines = doc.splitTextToSize(planB.overview, contentWidth - 8);
      const boxH = overviewLines.length * 4.5 + 6;
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F');
      doc.setFontSize(9);
      setColor(COLORS.text);
      doc.text(overviewLines, margin + 4, y + 5);
      y += boxH + 6;
    }

    // Triggers
    if (planB.triggers.length > 0) {
      addSubsectionHeader(l.triggers);
      planB.triggers.slice(0, 4).forEach(trigger => addBullet(trigger, 2));
      addSpacer(6);
    }

    // Go-now checklist
    if (planB.go_now_checklist.length > 0) {
      checkPageBreak(30);
      addSubsectionHeader(l.grabAndGo);
      const checkItems = planB.go_now_checklist.slice(0, 8);
      const halfLen = Math.ceil(checkItems.length / 2);
      
      checkItems.forEach((item, idx) => {
        const isLeft = idx < halfLen;
        const xPos = isLeft ? margin + 2 : margin + contentWidth / 2;
        if (!isLeft && idx === halfLen) y -= halfLen * 5;
        doc.setFontSize(9);
        setColor(COLORS.textMuted);
        doc.text('☐', xPos, y);
        setColor(COLORS.text);
        doc.text(item, xPos + 5, y);
        y += 5;
      });
      y += 4;
    }

    // Routes
    if (planB.routes) {
      checkPageBreak(25);
      addSubsectionHeader(l.routes);
      if (planB.routes.primary) {
        addLabelValue(l.primaryRoute, planB.routes.primary, 2);
      }
      if (planB.routes.alt1) {
        addLabelValue(l.altRoute1, planB.routes.alt1, 2);
      }
      if (planB.routes.alt2) {
        addLabelValue(l.altRoute2, planB.routes.alt2, 2);
      }
      addSpacer(4);
    }

    // Destinations
    if (planB.destinations_ranked && planB.destinations_ranked.length > 0) {
      checkPageBreak(25);
      addSubsectionHeader(l.destinations);
      planB.destinations_ranked.slice(0, 3).forEach((dest, idx) => {
        addNumberedItem(idx + 1, `${dest.label} — ${dest.reason}`, 2);
      });
      addSpacer(4);
    }

    // No-go zones
    if (planB.no_go_zones && planB.no_go_zones.length > 0) {
      checkPageBreak(20);
      addSubsectionHeader(l.noGoZones);
      setFillColor(COLORS.primaryLight);
      const zoneText = planB.no_go_zones.slice(0, 4).join(' • ');
      const zoneLines = doc.splitTextToSize(zoneText, contentWidth - 8);
      const boxH = zoneLines.length * 4.5 + 4;
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F');
      doc.setFontSize(9);
      setColor(COLORS.primary);
      doc.text(zoneLines, margin + 4, y + 4);
      y += boxH + 4;
    }

    // Meeting points
    if (planB.meetup_points?.primary) {
      checkPageBreak(20);
      addSubsectionHeader(l.meetingPoints);
      addBullet(`Primary: ${planB.meetup_points.primary}`, 2);
      if (planB.meetup_points.secondary) {
        addBullet(`Secondary: ${planB.meetup_points.secondary}`, 2);
      }
      addSpacer(4);
    }

    // Comms plan
    if (planB.comms_plan) {
      checkPageBreak(20);
      addSubsectionHeader(l.commsPlan);
      addText(planB.comms_plan, 2);
    }
  } else {
    addText(l.noPlan);
  }

  addFooter(5, 5);

  // Return as data URL for preview (avoids blob URL blocking) or blob for download
  if (options?.outputType === 'dataurl') {
    return doc.output('datauristring');
  }
  
  const pdfBlob = doc.output('blob');
  return new Blob([pdfBlob], { type: 'application/pdf' });
}
