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

export interface VaultSectionData {
  ids?: {
    fullName?: string;
    address?: string;
    nationalId?: string;
    notes?: string;
    dob?: string;
  };
  contacts?: {
    primary?: VaultContactData[];
    doctor?: string;
    vet?: string;
    insurance?: string;
    importantServices?: string;
  };
  medical?: {
    allergies?: string;
    medications?: string;
    conditions?: string;
    emergencyNotes?: string;
  };
  finance?: {
    banks?: string;
    policyNumbers?: string;
    emergencyCash?: string;
  };
  devices?: {
    phones?: string;
    accounts?: string;
    recoveryNotes?: string;
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

// Build the PDF blob
export async function buildRedFolderPdf(
  data: RedFolderPdfData, 
  options: PdfOptions = {}
): Promise<Blob> {
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

  const contacts = vault.contacts?.primary || [];
  if (contacts.length > 0) {
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

    // Table rows
    contacts.slice(0, 8).forEach((contact, idx) => {
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

  // Additional contacts
  addSpacer(6);
  if (vault.contacts?.doctor) addBullet(`Doctor: ${vault.contacts.doctor}`);
  if (vault.contacts?.vet) addBullet(`Vet: ${vault.contacts.vet}`);
  if (vault.contacts?.insurance) addBullet(`Insurance: ${vault.contacts.insurance}`);
  if (vault.contacts?.importantServices) addBullet(`Services: ${vault.contacts.importantServices}`);

  addSpacer(8);
  addDivider();
  addSpacer(4);

  // Medical Section
  addSectionHeader(l.medicalInfo, COLORS.primary);

  const hasMedical = vault.medical?.allergies || vault.medical?.medications || 
                     vault.medical?.conditions || vault.medical?.emergencyNotes;

  if (hasMedical) {
    // Two-column layout for medical
    const colWidth = contentWidth / 2 - 4;
    const startY = y;

    // Left column
    if (vault.medical?.allergies) {
      addSubsectionHeader(l.allergies);
      addText(vault.medical.allergies, 2);
      addSpacer(4);
    }
    if (vault.medical?.conditions) {
      addSubsectionHeader(l.conditions);
      addText(vault.medical.conditions, 2);
    }

    const leftEndY = y;

    // Right column
    y = startY;
    const rightStart = margin + colWidth + 8;

    if (vault.medical?.medications) {
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

  // Return as blob
  return doc.output('blob');
}
