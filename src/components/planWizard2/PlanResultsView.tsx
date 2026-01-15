/**
 * Plan Results View
 * 
 * Displays generated Plan A and Plan B in collapsible cards
 * with inline editing capability for each section.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Home, 
  Route, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckSquare,
  MessageSquare,
  MapPin,
  FileText,
  Pencil,
  Printer,
  Share2,
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { GeneratedPlanA, GeneratedPlanB } from '@/lib/planWizard2Types';
import { toast } from 'sonner';
import {
  ListEditor,
  TextEditor,
  MeetupPointsEditor,
  RoutesEditor,
  ChecklistsEditor,
  DestinationsEditor,
  SectionEditWrapper,
} from './PlanSectionEditor';

interface PlanResultsViewProps {
  planA: GeneratedPlanA;
  planB: GeneratedPlanB;
  onRegenerate: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onShare?: () => void;
  onBack: () => void;
  onSave?: (planA: GeneratedPlanA, planB: GeneratedPlanB) => Promise<void>;
}

type EditingSection = {
  plan: 'A' | 'B';
  section: string;
} | null;

function Section({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = false,
  onEdit,
  canEdit = true,
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  onEdit?: () => void;
  canEdit?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger className="flex-1 flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-8 w-8 print:hidden"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <CollapsibleContent className="pt-3 px-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ListItems({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <p className="text-muted-foreground text-sm italic">No items</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="text-sm flex items-start gap-2">
          <span className="text-primary mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChecklistSection({ 
  title, 
  checklists,
  onEdit,
}: { 
  title: string;
  checklists: GeneratedPlanA['checklists'];
  onEdit?: () => void;
}) {
  const { locale } = useLocale();
  
  const categories = [
    { key: 'docs', label: locale === 'pt' ? 'Documentos' : 'Documents' },
    { key: 'meds', label: locale === 'pt' ? 'Medicamentos' : 'Medications' },
    { key: 'money', label: locale === 'pt' ? 'Dinheiro' : 'Money' },
    { key: 'comms', label: locale === 'pt' ? 'Comunicação' : 'Communications' },
    { key: 'gear', label: locale === 'pt' ? 'Equipamento' : 'Gear' },
    { key: 'pets_kids', label: locale === 'pt' ? 'Crianças & Animais' : 'Kids & Pets' },
    { key: 'home', label: locale === 'pt' ? 'Casa' : 'Home' },
  ];

  return (
    <Section title={title} icon={CheckSquare} onEdit={onEdit}>
      <div className="space-y-3">
        {categories.map(({ key, label }) => {
          const items = checklists?.[key as keyof typeof checklists] || [];
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <Badge variant="outline" className="mb-2">{label}</Badge>
              <ListItems items={items} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function PlanACard({ 
  plan, 
  editingSection,
  onStartEdit,
  onSaveSection,
  onCancelEdit,
  saving,
}: { 
  plan: GeneratedPlanA;
  editingSection: EditingSection;
  onStartEdit: (section: string) => void;
  onSaveSection: (section: string, value: unknown) => void;
  onCancelEdit: () => void;
  saving: boolean;
}) {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const isEditing = (section: string) => 
    editingSection?.plan === 'A' && editingSection?.section === section;

  const startEdit = (section: string, initialValue: unknown) => {
    setEditValues({ [section]: initialValue });
    onStartEdit(section);
  };

  const getEditValue = <T,>(section: string, fallback: T): T => {
    return (editValues[section] as T) ?? fallback;
  };

  return (
    <Card className="border-green-200 bg-green-50/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-green-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Home className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-800">
                    {locale === 'pt' ? 'Plano A: Ficar / Abrigar' : 'Plan A: Shelter / Stay'}
                  </CardTitle>
                  <p className="text-sm text-green-600">
                    {locale === 'pt' ? 'Quando é seguro ficar em casa' : 'When it\'s safe to stay home'}
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-green-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-green-600" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Overview */}
            {isEditing('overview') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('overview', editValues.overview)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('overview', plan.overview || '')}
                  onChange={(v) => setEditValues({ ...editValues, overview: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.overview && (
              <div className="p-3 rounded-lg bg-white/80 border border-green-100 group relative">
                <p className="text-sm">{plan.overview}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit('overview', plan.overview)}
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Triggers */}
            {isEditing('triggers') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('triggers', editValues.triggers)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('triggers', plan.triggers || [])}
                  onChange={(v) => setEditValues({ ...editValues, triggers: v })}
                />
              </SectionEditWrapper>
            ) : (
              <Section 
                title={locale === 'pt' ? 'Gatilhos para Mudar para Plano B' : 'Triggers to Switch to Plan B'} 
                icon={AlertTriangle} 
                defaultOpen
                onEdit={() => startEdit('triggers', plan.triggers || [])}
              >
                <ListItems items={plan.triggers || []} />
              </Section>
            )}

            {/* First Hour */}
            {isEditing('first_hour') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('first_hour', editValues.first_hour)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('first_hour', plan.first_hour || [])}
                  onChange={(v) => setEditValues({ ...editValues, first_hour: v })}
                />
              </SectionEditWrapper>
            ) : (
              <Section 
                title={locale === 'pt' ? 'Primeira Hora' : 'First Hour'} 
                icon={Clock}
                onEdit={() => startEdit('first_hour', plan.first_hour || [])}
              >
                <ListItems items={plan.first_hour || []} />
              </Section>
            )}

            {/* First 24h */}
            {isEditing('first_24h') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('first_24h', editValues.first_24h)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('first_24h', plan.first_24h || [])}
                  onChange={(v) => setEditValues({ ...editValues, first_24h: v })}
                />
              </SectionEditWrapper>
            ) : (
              <Section 
                title={locale === 'pt' ? 'Primeiras 24 Horas' : 'First 24 Hours'} 
                icon={Clock}
                onEdit={() => startEdit('first_24h', plan.first_24h || [])}
              >
                <ListItems items={plan.first_24h || []} />
              </Section>
            )}

            {/* First Week */}
            {isEditing('first_week') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('first_week', editValues.first_week)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('first_week', plan.first_week || [])}
                  onChange={(v) => setEditValues({ ...editValues, first_week: v })}
                />
              </SectionEditWrapper>
            ) : (
              <Section 
                title={locale === 'pt' ? 'Primeira Semana' : 'First Week'} 
                icon={Clock}
                onEdit={() => startEdit('first_week', plan.first_week || [])}
              >
                <ListItems items={plan.first_week || []} />
              </Section>
            )}

            {/* Checklists */}
            {isEditing('checklists') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('checklists', editValues.checklists)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ChecklistsEditor
                  value={getEditValue('checklists', plan.checklists || {
                    docs: [], meds: [], money: [], comms: [], gear: [], pets_kids: [], home: []
                  })}
                  onChange={(v) => setEditValues({ ...editValues, checklists: v })}
                />
              </SectionEditWrapper>
            ) : (
              <ChecklistSection 
                title={locale === 'pt' ? 'Checklists' : 'Checklists'}
                checklists={plan.checklists}
                onEdit={() => startEdit('checklists', plan.checklists || {})}
              />
            )}

            {/* Communication */}
            {isEditing('comms_plan') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('comms_plan', editValues.comms_plan)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('comms_plan', plan.comms_plan || '')}
                  onChange={(v) => setEditValues({ ...editValues, comms_plan: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.comms_plan && (
              <Section 
                title={locale === 'pt' ? 'Plano de Comunicação' : 'Communication Plan'} 
                icon={MessageSquare}
                onEdit={() => startEdit('comms_plan', plan.comms_plan || '')}
              >
                <p className="text-sm">{plan.comms_plan}</p>
              </Section>
            )}

            {/* Meeting Points */}
            {isEditing('meetup_points') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('meetup_points', editValues.meetup_points)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <MeetupPointsEditor
                  value={getEditValue('meetup_points', plan.meetup_points || { primary: '', secondary: '' })}
                  onChange={(v) => setEditValues({ ...editValues, meetup_points: v })}
                />
              </SectionEditWrapper>
            ) : plan.meetup_points && (
              <Section 
                title={locale === 'pt' ? 'Pontos de Encontro' : 'Meeting Points'} 
                icon={MapPin}
                onEdit={() => startEdit('meetup_points', plan.meetup_points || { primary: '', secondary: '' })}
              >
                <div className="space-y-2 text-sm">
                  {plan.meetup_points.primary && (
                    <p><strong>{locale === 'pt' ? 'Principal:' : 'Primary:'}</strong> {plan.meetup_points.primary}</p>
                  )}
                  {plan.meetup_points.secondary && (
                    <p><strong>{locale === 'pt' ? 'Secundário:' : 'Secondary:'}</strong> {plan.meetup_points.secondary}</p>
                  )}
                </div>
              </Section>
            )}

            {/* Notes */}
            {isEditing('notes') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('notes', editValues.notes)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('notes', plan.notes || '')}
                  onChange={(v) => setEditValues({ ...editValues, notes: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.notes && (
              <Section 
                title={locale === 'pt' ? 'Notas Adicionais' : 'Additional Notes'} 
                icon={FileText}
                onEdit={() => startEdit('notes', plan.notes || '')}
              >
                <p className="text-sm">{plan.notes}</p>
              </Section>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PlanBCard({ 
  plan,
  editingSection,
  onStartEdit,
  onSaveSection,
  onCancelEdit,
  saving,
}: { 
  plan: GeneratedPlanB;
  editingSection: EditingSection;
  onStartEdit: (section: string) => void;
  onSaveSection: (section: string, value: unknown) => void;
  onCancelEdit: () => void;
  saving: boolean;
}) {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const isEditing = (section: string) => 
    editingSection?.plan === 'B' && editingSection?.section === section;

  const startEdit = (section: string, initialValue: unknown) => {
    setEditValues({ [section]: initialValue });
    onStartEdit(section);
  };

  const getEditValue = <T,>(section: string, fallback: T): T => {
    return (editValues[section] as T) ?? fallback;
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-amber-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Route className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <CardTitle className="text-lg text-amber-800">
                    {locale === 'pt' ? 'Plano B: Evacuar / Sair' : 'Plan B: Evacuate / Leave'}
                  </CardTitle>
                  <p className="text-sm text-amber-600">
                    {locale === 'pt' ? 'Quando precisar sair de casa' : 'When you need to leave home'}
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-amber-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-amber-600" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Overview */}
            {isEditing('overview') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('overview', editValues.overview)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('overview', plan.overview || '')}
                  onChange={(v) => setEditValues({ ...editValues, overview: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.overview && (
              <div className="p-3 rounded-lg bg-white/80 border border-amber-100 group relative">
                <p className="text-sm">{plan.overview}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit('overview', plan.overview)}
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Triggers */}
            {isEditing('triggers') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('triggers', editValues.triggers)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('triggers', plan.triggers || [])}
                  onChange={(v) => setEditValues({ ...editValues, triggers: v })}
                />
              </SectionEditWrapper>
            ) : (
              <Section 
                title={locale === 'pt' ? 'Gatilhos para Ativar Plano B' : 'Triggers to Activate Plan B'} 
                icon={AlertTriangle} 
                defaultOpen
                onEdit={() => startEdit('triggers', plan.triggers || [])}
              >
                <ListItems items={plan.triggers || []} />
              </Section>
            )}

            {/* Go Now Checklist */}
            {isEditing('go_now_checklist') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('go_now_checklist', editValues.go_now_checklist)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('go_now_checklist', plan.go_now_checklist || [])}
                  onChange={(v) => setEditValues({ ...editValues, go_now_checklist: v })}
                />
              </SectionEditWrapper>
            ) : (
              <Section 
                title={locale === 'pt' ? 'Checklist "Sair Agora"' : 'Go Now Checklist'} 
                icon={CheckSquare}
                onEdit={() => startEdit('go_now_checklist', plan.go_now_checklist || [])}
              >
                <ListItems items={plan.go_now_checklist || []} />
              </Section>
            )}

            {/* Routes */}
            {isEditing('routes') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('routes', editValues.routes)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <RoutesEditor
                  value={getEditValue('routes', plan.routes || { primary: '', alt1: '', alt2: '', fallback: '' })}
                  onChange={(v) => setEditValues({ ...editValues, routes: v })}
                />
              </SectionEditWrapper>
            ) : plan.routes && (
              <Section 
                title={locale === 'pt' ? 'Rotas Estratégicas' : 'Strategic Routes'} 
                icon={Route}
                onEdit={() => startEdit('routes', plan.routes || { primary: '', alt1: '', alt2: '', fallback: '' })}
              >
                <div className="space-y-3 text-sm">
                  {plan.routes.primary && (
                    <div>
                      <Badge className="mb-1 bg-green-100 text-green-800">{locale === 'pt' ? 'Rota Principal' : 'Primary Route'}</Badge>
                      <p>{plan.routes.primary}</p>
                    </div>
                  )}
                  {plan.routes.alt1 && (
                    <div>
                      <Badge variant="outline" className="mb-1">{locale === 'pt' ? 'Alternativa 1' : 'Alternative 1'}</Badge>
                      <p>{plan.routes.alt1}</p>
                    </div>
                  )}
                  {plan.routes.alt2 && (
                    <div>
                      <Badge variant="outline" className="mb-1">{locale === 'pt' ? 'Alternativa 2' : 'Alternative 2'}</Badge>
                      <p>{plan.routes.alt2}</p>
                    </div>
                  )}
                  {plan.routes.fallback && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Fallback</Badge>
                      <p>{plan.routes.fallback}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Destinations */}
            {isEditing('destinations_ranked') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('destinations_ranked', editValues.destinations_ranked)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <DestinationsEditor
                  value={getEditValue('destinations_ranked', plan.destinations_ranked || [])}
                  onChange={(v) => setEditValues({ ...editValues, destinations_ranked: v })}
                />
              </SectionEditWrapper>
            ) : plan.destinations_ranked && plan.destinations_ranked.length > 0 && (
              <Section 
                title={locale === 'pt' ? 'Destinos por Prioridade' : 'Destinations by Priority'} 
                icon={MapPin}
                onEdit={() => startEdit('destinations_ranked', plan.destinations_ranked || [])}
              >
                <div className="space-y-2">
                  {plan.destinations_ranked.map((dest, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white/80 border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{dest.priority}</Badge>
                        <span className="font-medium text-sm">{dest.label}</span>
                      </div>
                      {dest.reason && <p className="text-xs text-muted-foreground mt-1">{dest.reason}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* No-Go Zones */}
            {isEditing('no_go_zones') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('no_go_zones', editValues.no_go_zones)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <ListEditor
                  items={getEditValue('no_go_zones', plan.no_go_zones || [])}
                  onChange={(v) => setEditValues({ ...editValues, no_go_zones: v })}
                />
              </SectionEditWrapper>
            ) : plan.no_go_zones && plan.no_go_zones.length > 0 && (
              <Section 
                title={locale === 'pt' ? 'Zonas a Evitar' : 'No-Go Zones'} 
                icon={AlertTriangle}
                onEdit={() => startEdit('no_go_zones', plan.no_go_zones || [])}
              >
                <ListItems items={plan.no_go_zones} />
              </Section>
            )}

            {/* Vehicle Plan */}
            {isEditing('vehicle_plan') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('vehicle_plan', editValues.vehicle_plan)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('vehicle_plan', plan.vehicle_plan || '')}
                  onChange={(v) => setEditValues({ ...editValues, vehicle_plan: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.vehicle_plan && (
              <Section 
                title={locale === 'pt' ? 'Plano de Veículo' : 'Vehicle Plan'} 
                icon={Route}
                onEdit={() => startEdit('vehicle_plan', plan.vehicle_plan || '')}
              >
                <p className="text-sm">{plan.vehicle_plan}</p>
              </Section>
            )}

            {/* Border Crossing */}
            {isEditing('border_crossing_notes') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('border_crossing_notes', editValues.border_crossing_notes)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('border_crossing_notes', plan.border_crossing_notes || '')}
                  onChange={(v) => setEditValues({ ...editValues, border_crossing_notes: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.border_crossing_notes && (
              <Section 
                title={locale === 'pt' ? 'Notas de Fronteira' : 'Border Crossing Notes'} 
                icon={FileText}
                onEdit={() => startEdit('border_crossing_notes', plan.border_crossing_notes || '')}
              >
                <p className="text-sm">{plan.border_crossing_notes}</p>
              </Section>
            )}

            {/* Communication */}
            {isEditing('comms_plan') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('comms_plan', editValues.comms_plan)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('comms_plan', plan.comms_plan || '')}
                  onChange={(v) => setEditValues({ ...editValues, comms_plan: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.comms_plan && (
              <Section 
                title={locale === 'pt' ? 'Plano de Comunicação' : 'Communication Plan'} 
                icon={MessageSquare}
                onEdit={() => startEdit('comms_plan', plan.comms_plan || '')}
              >
                <p className="text-sm">{plan.comms_plan}</p>
              </Section>
            )}

            {/* Meeting Points */}
            {isEditing('meetup_points') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('meetup_points', editValues.meetup_points)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <MeetupPointsEditor
                  value={getEditValue('meetup_points', plan.meetup_points || { primary: '', secondary: '' })}
                  onChange={(v) => setEditValues({ ...editValues, meetup_points: v })}
                />
              </SectionEditWrapper>
            ) : plan.meetup_points && (
              <Section 
                title={locale === 'pt' ? 'Pontos de Encontro' : 'Meeting Points'} 
                icon={MapPin}
                onEdit={() => startEdit('meetup_points', plan.meetup_points || { primary: '', secondary: '' })}
              >
                <div className="space-y-2 text-sm">
                  {plan.meetup_points.primary && (
                    <p><strong>{locale === 'pt' ? 'Principal:' : 'Primary:'}</strong> {plan.meetup_points.primary}</p>
                  )}
                  {plan.meetup_points.secondary && (
                    <p><strong>{locale === 'pt' ? 'Secundário:' : 'Secondary:'}</strong> {plan.meetup_points.secondary}</p>
                  )}
                </div>
              </Section>
            )}

            {/* Notes */}
            {isEditing('notes') ? (
              <SectionEditWrapper
                onSave={() => onSaveSection('notes', editValues.notes)}
                onCancel={onCancelEdit}
                saving={saving}
              >
                <TextEditor
                  value={getEditValue('notes', plan.notes || '')}
                  onChange={(v) => setEditValues({ ...editValues, notes: v })}
                  multiline
                />
              </SectionEditWrapper>
            ) : plan.notes && (
              <Section 
                title={locale === 'pt' ? 'Notas Adicionais' : 'Additional Notes'} 
                icon={FileText}
                onEdit={() => startEdit('notes', plan.notes || '')}
              >
                <p className="text-sm">{plan.notes}</p>
              </Section>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function PlanResultsView({ 
  planA, 
  planB, 
  onRegenerate, 
  onEdit, 
  onPrint, 
  onShare, 
  onBack,
  onSave,
}: PlanResultsViewProps) {
  const { locale } = useLocale();
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [localPlanA, setLocalPlanA] = useState(planA);
  const [localPlanB, setLocalPlanB] = useState(planB);

  const handleStartEditA = useCallback((section: string) => {
    setEditingSection({ plan: 'A', section });
  }, []);

  const handleStartEditB = useCallback((section: string) => {
    setEditingSection({ plan: 'B', section });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
  }, []);

  const handleSaveSectionA = useCallback(async (section: string, value: unknown) => {
    if (!onSave) {
      toast.error(locale === 'pt' ? 'Guardar não disponível' : 'Save not available');
      return;
    }

    setSaving(true);
    try {
      const updatedPlanA = { ...localPlanA, [section]: value } as GeneratedPlanA;
      await onSave(updatedPlanA, localPlanB);
      setLocalPlanA(updatedPlanA);
      setEditingSection(null);
      toast.success(locale === 'pt' ? 'Secção guardada' : 'Section saved');
    } catch (error) {
      console.error('Failed to save section:', error);
      toast.error(locale === 'pt' ? 'Falha ao guardar' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [localPlanA, localPlanB, onSave, locale]);

  const handleSaveSectionB = useCallback(async (section: string, value: unknown) => {
    if (!onSave) {
      toast.error(locale === 'pt' ? 'Guardar não disponível' : 'Save not available');
      return;
    }

    setSaving(true);
    try {
      const updatedPlanB = { ...localPlanB, [section]: value } as GeneratedPlanB;
      await onSave(localPlanA, updatedPlanB);
      setLocalPlanB(updatedPlanB);
      setEditingSection(null);
      toast.success(locale === 'pt' ? 'Secção guardada' : 'Section saved');
    } catch (error) {
      console.error('Failed to save section:', error);
      toast.error(locale === 'pt' ? 'Falha ao guardar' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [localPlanA, localPlanB, onSave, locale]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">
            {locale === 'pt' ? 'Os Seus Planos de Emergência' : 'Your Emergency Plans'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'pt' 
              ? 'Personalizados para a sua situação'
              : 'Personalized for your situation'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {locale === 'pt' ? 'Voltar' : 'Back'}
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" />
            {locale === 'pt' ? 'Imprimir' : 'Print'}
          </Button>
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Red Folder
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {locale === 'pt' ? 'Regenerar' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-3xl font-bold">
          {locale === 'pt' ? 'Planos de Emergência' : 'Emergency Plans'}
        </h1>
        <p className="text-muted-foreground">
          {locale === 'pt' ? 'Gerado em' : 'Generated on'} {new Date().toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-GB')}
        </p>
      </div>

      {/* Plans */}
      <div className="grid gap-6">
        <PlanACard 
          plan={localPlanA} 
          editingSection={editingSection}
          onStartEdit={handleStartEditA}
          onSaveSection={handleSaveSectionA}
          onCancelEdit={handleCancelEdit}
          saving={saving}
        />
        <PlanBCard 
          plan={localPlanB}
          editingSection={editingSection}
          onStartEdit={handleStartEditB}
          onSaveSection={handleSaveSectionB}
          onCancelEdit={handleCancelEdit}
          saving={saving}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4 print:hidden">
        <Button variant="outline" onClick={onPrint}>
          <Printer className="h-4 w-4 mr-2" />
          {locale === 'pt' ? 'Imprimir' : 'Print'}
        </Button>
        {onShare && (
          <Button variant="outline" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            {locale === 'pt' ? 'Exportar para Red Folder' : 'Export to Red Folder'}
          </Button>
        )}
        <Button onClick={onBack}>
          {locale === 'pt' ? 'Concluído' : 'Done'}
        </Button>
      </div>
    </div>
  );
}
