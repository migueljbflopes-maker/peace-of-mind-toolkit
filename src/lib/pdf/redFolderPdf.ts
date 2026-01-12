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

// PDF labels by locale
const labels = {
  en: {
    title: 'Personalized Resiliency Plan',
    subtitle: 'Red Folder Format',
    generated: 'Generated',
    disclaimer: 'This document is for personal preparedness purposes only. Always follow official guidance from local authorities during emergencies.',
    page: 'Page',
    // Page 1
    coverSummary: 'Summary',
    riskLevel: 'Risk Level',
    topPriorities: 'Top Priorities',
    notProvided: 'Not provided',
    noAssessment: 'No risk assessment saved',
    // Page 2
    essentialsChecklist: '14-Day Essentials Checklist',
    preparedness: 'Preparedness',
    grabAndGo: 'Grab-and-Go Essentials',
    noSuppliesPlan: 'No supplies plan saved',
    category: 'Category',
    // Page 3
    contactsMedical: 'Contacts & Medical Basics',
    emergencyContacts: 'Emergency Contacts',
    medicalInfo: 'Medical Information',
    allergies: 'Allergies',
    medications: 'Medications',
    conditions: 'Conditions',
    notes: 'Notes',
    // Page 4+
    plansTitle: 'Plans A & B',
    planA: 'Plan A — Shelter in Place',
    planB: 'Plan B — Leave / Relocate',
    triggers: 'Triggers',
    firstHour: 'First Hour',
    first24h: 'First 24 Hours',
    firstWeek: 'First Week',
    routes: 'Routes',
    primaryRoute: 'Primary',
    altRoute1: 'Alternative 1',
    altRoute2: 'Alternative 2',
    destinations: 'Destinations',
    noGoZones: 'No-Go Zones',
    meetingPoints: 'Meeting Points',
    commsPlan: 'Communication Plan',
    noPlan: 'No plan saved',
    overview: 'Overview',
  },
  pt: {
    title: 'Plano de Resiliência Personalizado',
    subtitle: 'Formato Red Folder',
    generated: 'Gerado',
    disclaimer: 'Este documento é apenas para preparação pessoal. Siga sempre as orientações oficiais das autoridades locais durante emergências.',
    page: 'Página',
    // Page 1
    coverSummary: 'Resumo',
    riskLevel: 'Nível de Risco',
    topPriorities: 'Prioridades Principais',
    notProvided: 'Não fornecido',
    noAssessment: 'Sem avaliação de risco guardada',
    // Page 2
    essentialsChecklist: 'Lista de Essenciais 14 Dias',
    preparedness: 'Preparação',
    grabAndGo: 'Essenciais para Levar',
    noSuppliesPlan: 'Sem plano de suprimentos guardado',
    category: 'Categoria',
    // Page 3
    contactsMedical: 'Contactos & Dados Médicos',
    emergencyContacts: 'Contactos de Emergência',
    medicalInfo: 'Informação Médica',
    allergies: 'Alergias',
    medications: 'Medicações',
    conditions: 'Condições',
    notes: 'Notas',
    // Page 4+
    plansTitle: 'Planos A & B',
    planA: 'Plano A — Ficar em Casa',
    planB: 'Plano B — Sair / Evacuar',
    triggers: 'Gatilhos de Ação',
    firstHour: 'Primeira Hora',
    first24h: 'Primeiras 24 Horas',
    firstWeek: 'Primeira Semana',
    routes: 'Rotas',
    primaryRoute: 'Principal',
    altRoute1: 'Alternativa 1',
    altRoute2: 'Alternativa 2',
    destinations: 'Destinos',
    noGoZones: 'Zonas a Evitar',
    meetingPoints: 'Pontos de Encontro',
    commsPlan: 'Plano de Comunicação',
    noPlan: 'Sem plano guardado',
    overview: 'Resumo',
  },
};

// Risk level translations
const riskLevelLabels = {
  en: { low: 'Low', medium: 'Medium', high: 'High' },
  pt: { low: 'Baixo', medium: 'Médio', high: 'Alto' },
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
export async function buildRedFolderPdf(data: RedFolderPdfData): Promise<Blob> {
  const { locale, risk, supplies, vault, planA, planB, generatedAt } = data;
  const l = labels[locale];
  const riskLabels = riskLevelLabels[locale];
  
  // Calculate total pages: 3 base + 1 for Plan A + 1 for Plan B if they exist
  const totalPages = 3 + (planA ? 1 : 0) + (planB ? 1 : 0) + (planA || planB ? 0 : 1);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;
  let currentPage = 1;

  // Helper functions
  const addPageNumber = (pageNum: number) => {
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.text(`${l.page} ${pageNum}/${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.setTextColor(0);
  };

  const addHeader = (text: string, size: number = 16) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += size * 0.5;
  };

  const addSubheader = (text: string) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += 7;
  };

  const addText = (text: string, indent: number = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5;
  };

  const addBullet = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('•', margin, y);
    const lines = doc.splitTextToSize(text, contentWidth - 8);
    doc.text(lines, margin + 6, y);
    y += lines.length * 5;
  };

  const addSpacer = (height: number = 5) => {
    y += height;
  };

  const checkPageBreak = (needed: number = 30) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      currentPage++;
      y = margin;
      return true;
    }
    return false;
  };

  // ==================== PAGE 1: Cover + Summary ====================
  
  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(l.title, pageWidth / 2, y + 10, { align: 'center' });
  y += 18;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(l.subtitle, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 15;

  // Generated date
  doc.setFontSize(10);
  doc.text(`${l.generated}: ${formatDate(generatedAt, locale)}`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Horizontal line
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Summary section
  addHeader(l.coverSummary, 14);
  addSpacer(5);

  if (risk) {
    const levelKey = (risk.riskLevel || 'medium').toLowerCase() as 'low' | 'medium' | 'high';
    addText(`${l.riskLevel}: ${riskLabels[levelKey] || risk.riskLevel} (${risk.score || 0}/100)`);
    if (risk.city || risk.country) {
      addText(`${risk.city || ''}${risk.city && risk.country ? ', ' : ''}${risk.country || ''}`);
    }
    addSpacer(10);
    
    // Top priorities from breakdown
    addSubheader(l.topPriorities);
    const breakdownItems = Object.entries(risk.breakdown || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3);
    
    if (breakdownItems.length > 0) {
      breakdownItems.forEach(([key, value]) => {
        addBullet(`${key}: ${value}%`);
      });
    } else {
      addText(l.notProvided);
    }
  } else {
    addText(l.noAssessment);
  }

  addSpacer(20);

  // Disclaimer
  doc.setFontSize(9);
  doc.setTextColor(100);
  const disclaimerLines = doc.splitTextToSize(l.disclaimer, contentWidth);
  doc.text(disclaimerLines, margin, pageHeight - 25);
  doc.setTextColor(0);

  addPageNumber(1);

  // ==================== PAGE 2: Essentials Checklist ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addHeader(l.essentialsChecklist, 16);
  addSpacer(5);

  if (supplies) {
    addText(`${l.preparedness}: ${supplies.preparednessPercent || 0}%`);
    addSpacer(10);

    // Categories from supplies plan
    const plan = supplies.plan as Record<string, { items?: Array<{ name: string; quantity?: number; unit?: string }> }>;
    const categories = Object.entries(plan || {}).slice(0, 8);

    if (categories.length > 0) {
      categories.forEach(([category, data]) => {
        checkPageBreak(20);
        addSubheader(category);
        const items = data?.items || [];
        items.slice(0, 5).forEach((item) => {
          addBullet(`${item.name}${item.quantity ? ` (${item.quantity}${item.unit ? ' ' + item.unit : ''})` : ''}`);
        });
        addSpacer(5);
      });
    }

    // Grab-and-go section
    checkPageBreak(30);
    addSpacer(10);
    addSubheader(l.grabAndGo);
    const essentials = ['Water (3L/person)', 'First aid kit', 'Flashlight', 'Important documents', 'Cash'];
    const essentialsPt = ['Água (3L/pessoa)', 'Kit primeiros socorros', 'Lanterna', 'Documentos importantes', 'Dinheiro'];
    (locale === 'pt' ? essentialsPt : essentials).forEach(item => addBullet(item));
  } else {
    addText(l.noSuppliesPlan);
  }

  addPageNumber(2);

  // ==================== PAGE 3: Contacts & Medical ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addHeader(l.contactsMedical, 16);
  addSpacer(10);

  // Contacts
  addSubheader(l.emergencyContacts);
  const contacts = vault.contacts?.primary || [];
  if (contacts.length > 0) {
    contacts.forEach((contact) => {
      addBullet(`${contact.name}${contact.relationship ? ` (${contact.relationship})` : ''}${contact.phone ? `: ${contact.phone}` : ''}`);
    });
  } else {
    addText(l.notProvided);
  }

  // Doctor, Vet, Insurance
  if (vault.contacts?.doctor) addBullet(`Doctor: ${vault.contacts.doctor}`);
  if (vault.contacts?.vet) addBullet(`Vet: ${vault.contacts.vet}`);
  if (vault.contacts?.insurance) addBullet(`Insurance: ${vault.contacts.insurance}`);

  addSpacer(15);

  // Medical info
  addSubheader(l.medicalInfo);
  
  if (vault.medical?.allergies) {
    addText(`${l.allergies}: ${vault.medical.allergies}`);
  }
  if (vault.medical?.medications) {
    addText(`${l.medications}: ${vault.medical.medications}`);
  }
  if (vault.medical?.conditions) {
    addText(`${l.conditions}: ${vault.medical.conditions}`);
  }
  if (vault.medical?.emergencyNotes) {
    addText(`${l.notes}: ${vault.medical.emergencyNotes}`);
  }

  if (!vault.medical?.allergies && !vault.medical?.medications && !vault.medical?.conditions) {
    addText(l.notProvided);
  }

  addPageNumber(3);

  // ==================== PAGE 4: Plan A (Shelter) ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addHeader(l.planA, 16);
  addSpacer(5);

  if (planA) {
    // Overview
    if (planA.overview) {
      addText(planA.overview);
      addSpacer(10);
    }

    // Triggers
    if (planA.triggers.length > 0) {
      addSubheader(l.triggers);
      planA.triggers.slice(0, 5).forEach(t => addBullet(t));
      addSpacer(8);
    }

    // First hour
    if (planA.first_hour.length > 0) {
      checkPageBreak(30);
      addSubheader(l.firstHour);
      planA.first_hour.slice(0, 6).forEach(s => addBullet(s));
      addSpacer(8);
    }

    // First 24h
    if (planA.first_24h.length > 0) {
      checkPageBreak(30);
      addSubheader(l.first24h);
      planA.first_24h.slice(0, 6).forEach(s => addBullet(s));
      addSpacer(8);
    }

    // First week
    if (planA.first_week.length > 0) {
      checkPageBreak(30);
      addSubheader(l.firstWeek);
      planA.first_week.slice(0, 5).forEach(s => addBullet(s));
      addSpacer(8);
    }

    // Meeting points
    if (planA.meetup_points?.primary) {
      checkPageBreak(20);
      addSubheader(l.meetingPoints);
      addBullet(`Primary: ${planA.meetup_points.primary}`);
      if (planA.meetup_points.secondary) {
        addBullet(`Secondary: ${planA.meetup_points.secondary}`);
      }
      addSpacer(8);
    }

    // Comms plan
    if (planA.comms_plan) {
      checkPageBreak(20);
      addSubheader(l.commsPlan);
      addText(planA.comms_plan);
    }
  } else {
    addText(l.noPlan);
  }

  addPageNumber(currentPage);

  // ==================== PAGE 5: Plan B (Evacuate) ====================
  doc.addPage();
  currentPage++;
  y = margin;

  addHeader(l.planB, 16);
  addSpacer(5);

  if (planB) {
    // Overview
    if (planB.overview) {
      addText(planB.overview);
      addSpacer(10);
    }

    // Triggers
    if (planB.triggers.length > 0) {
      addSubheader(l.triggers);
      planB.triggers.slice(0, 5).forEach(t => addBullet(t));
      addSpacer(8);
    }

    // Go-now checklist
    if (planB.go_now_checklist.length > 0) {
      checkPageBreak(30);
      addSubheader(l.grabAndGo);
      planB.go_now_checklist.slice(0, 8).forEach(s => addBullet(s));
      addSpacer(8);
    }

    // Routes
    if (planB.routes) {
      checkPageBreak(30);
      addSubheader(l.routes);
      if (planB.routes.primary) addBullet(`${l.primaryRoute}: ${planB.routes.primary}`);
      if (planB.routes.alt1) addBullet(`${l.altRoute1}: ${planB.routes.alt1}`);
      if (planB.routes.alt2) addBullet(`${l.altRoute2}: ${planB.routes.alt2}`);
      addSpacer(8);
    }

    // Destinations
    if (planB.destinations_ranked && planB.destinations_ranked.length > 0) {
      checkPageBreak(30);
      addSubheader(l.destinations);
      planB.destinations_ranked.slice(0, 3).forEach((dest, i) => {
        addBullet(`${i + 1}. ${dest.label} — ${dest.reason}`);
      });
      addSpacer(8);
    }

    // No-go zones
    if (planB.no_go_zones && planB.no_go_zones.length > 0) {
      checkPageBreak(20);
      addSubheader(l.noGoZones);
      planB.no_go_zones.slice(0, 4).forEach(z => addBullet(z));
      addSpacer(8);
    }

    // Meeting points
    if (planB.meetup_points?.primary) {
      checkPageBreak(20);
      addSubheader(l.meetingPoints);
      addBullet(`Primary: ${planB.meetup_points.primary}`);
      if (planB.meetup_points.secondary) {
        addBullet(`Secondary: ${planB.meetup_points.secondary}`);
      }
      addSpacer(8);
    }

    // Comms plan
    if (planB.comms_plan) {
      checkPageBreak(20);
      addSubheader(l.commsPlan);
      addText(planB.comms_plan);
    }
  } else {
    addText(l.noPlan);
  }

  addPageNumber(currentPage);

  // Return as blob
  return doc.output('blob');
}
