/**
 * Plan Results View
 * 
 * Displays generated Plan A and Plan B in collapsible cards
 * with options to regenerate or go back.
 */

import { useState } from 'react';
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
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { GeneratedPlanA, GeneratedPlanB } from '@/lib/planWizard2Types';

interface PlanResultsViewProps {
  planA: GeneratedPlanA;
  planB: GeneratedPlanB;
  onRegenerate: () => void;
  onBack: () => void;
}

function Section({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = false,
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
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
  checklists 
}: { 
  title: string;
  checklists: GeneratedPlanA['checklists'];
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
    <Section title={title} icon={CheckSquare}>
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

function PlanACard({ plan }: { plan: GeneratedPlanA }) {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(true);

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
            {plan.overview && (
              <div className="p-3 rounded-lg bg-white/80 border border-green-100">
                <p className="text-sm">{plan.overview}</p>
              </div>
            )}

            {/* Triggers */}
            <Section title={locale === 'pt' ? 'Gatilhos para Mudar para Plano B' : 'Triggers to Switch to Plan B'} icon={AlertTriangle} defaultOpen>
              <ListItems items={plan.triggers || []} />
            </Section>

            {/* Timelines */}
            <Section title={locale === 'pt' ? 'Primeira Hora' : 'First Hour'} icon={Clock}>
              <ListItems items={plan.first_hour || []} />
            </Section>

            <Section title={locale === 'pt' ? 'Primeiras 24 Horas' : 'First 24 Hours'} icon={Clock}>
              <ListItems items={plan.first_24h || []} />
            </Section>

            <Section title={locale === 'pt' ? 'Primeira Semana' : 'First Week'} icon={Clock}>
              <ListItems items={plan.first_week || []} />
            </Section>

            {/* Checklists */}
            <ChecklistSection 
              title={locale === 'pt' ? 'Checklists' : 'Checklists'}
              checklists={plan.checklists}
            />

            {/* Communication */}
            {plan.comms_plan && (
              <Section title={locale === 'pt' ? 'Plano de Comunicação' : 'Communication Plan'} icon={MessageSquare}>
                <p className="text-sm">{plan.comms_plan}</p>
              </Section>
            )}

            {/* Meeting Points */}
            {plan.meetup_points && (
              <Section title={locale === 'pt' ? 'Pontos de Encontro' : 'Meeting Points'} icon={MapPin}>
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
            {plan.notes && (
              <Section title={locale === 'pt' ? 'Notas Adicionais' : 'Additional Notes'} icon={FileText}>
                <p className="text-sm">{plan.notes}</p>
              </Section>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PlanBCard({ plan }: { plan: GeneratedPlanB }) {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(true);

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
            {plan.overview && (
              <div className="p-3 rounded-lg bg-white/80 border border-amber-100">
                <p className="text-sm">{plan.overview}</p>
              </div>
            )}

            {/* Triggers */}
            <Section title={locale === 'pt' ? 'Gatilhos para Ativar Plano B' : 'Triggers to Activate Plan B'} icon={AlertTriangle} defaultOpen>
              <ListItems items={plan.triggers || []} />
            </Section>

            {/* Go Now Checklist */}
            <Section title={locale === 'pt' ? 'Checklist "Sair Agora"' : 'Go Now Checklist'} icon={CheckSquare}>
              <ListItems items={plan.go_now_checklist || []} />
            </Section>

            {/* Routes */}
            {plan.routes && (
              <Section title={locale === 'pt' ? 'Rotas Estratégicas' : 'Strategic Routes'} icon={Route}>
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
                      <Badge variant="secondary" className="mb-1">{locale === 'pt' ? 'Fallback' : 'Fallback'}</Badge>
                      <p>{plan.routes.fallback}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Destinations */}
            {plan.destinations_ranked && plan.destinations_ranked.length > 0 && (
              <Section title={locale === 'pt' ? 'Destinos por Prioridade' : 'Destinations by Priority'} icon={MapPin}>
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
            {plan.no_go_zones && plan.no_go_zones.length > 0 && (
              <Section title={locale === 'pt' ? 'Zonas a Evitar' : 'No-Go Zones'} icon={AlertTriangle}>
                <ListItems items={plan.no_go_zones} />
              </Section>
            )}

            {/* Vehicle Plan */}
            {plan.vehicle_plan && (
              <Section title={locale === 'pt' ? 'Plano de Veículo' : 'Vehicle Plan'} icon={Route}>
                <p className="text-sm">{plan.vehicle_plan}</p>
              </Section>
            )}

            {/* Border Crossing */}
            {plan.border_crossing_notes && (
              <Section title={locale === 'pt' ? 'Notas de Fronteira' : 'Border Crossing Notes'} icon={FileText}>
                <p className="text-sm">{plan.border_crossing_notes}</p>
              </Section>
            )}

            {/* Communication */}
            {plan.comms_plan && (
              <Section title={locale === 'pt' ? 'Plano de Comunicação' : 'Communication Plan'} icon={MessageSquare}>
                <p className="text-sm">{plan.comms_plan}</p>
              </Section>
            )}

            {/* Meeting Points */}
            {plan.meetup_points && (
              <Section title={locale === 'pt' ? 'Pontos de Encontro' : 'Meeting Points'} icon={MapPin}>
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
            {plan.notes && (
              <Section title={locale === 'pt' ? 'Notas Adicionais' : 'Additional Notes'} icon={FileText}>
                <p className="text-sm">{plan.notes}</p>
              </Section>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function PlanResultsView({ planA, planB, onRegenerate, onBack }: PlanResultsViewProps) {
  const { locale } = useLocale();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {locale === 'pt' ? 'Os Seus Planos de Emergência' : 'Your Emergency Plans'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'pt' 
              ? 'Gerados com base no seu contexto e preferências'
              : 'Generated based on your context and preferences'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {locale === 'pt' ? 'Voltar' : 'Back'}
          </Button>
          <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {locale === 'pt' ? 'Regenerar' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-6">
        <PlanACard plan={planA} />
        <PlanBCard plan={planB} />
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button onClick={onBack}>
          {locale === 'pt' ? 'Concluído' : 'Done'}
        </Button>
      </div>
    </div>
  );
}
