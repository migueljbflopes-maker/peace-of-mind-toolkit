/**
 * Plan Editor Component
 * Full-screen editor for Plan A or B with sections
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Target, 
  MapPin, 
  Users, 
  Accessibility, 
  Package, 
  Clock, 
  Calendar,
  FileText,
  ArrowLeft,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { PlanData, PlanType, createEmptyPlan } from '@/lib/plansStore';

interface PlanEditorProps {
  planType: PlanType;
  initialData: PlanData | null;
  onSave: (data: PlanData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ChipInput({ 
  items, 
  onChange, 
  placeholder 
}: { 
  items: string[]; 
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  
  const addItem = () => {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setInput('');
    }
  };
  
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="gap-1 py-1">
              {item}
              <button 
                type="button" 
                onClick={() => removeItem(i)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ListInput({ 
  items, 
  onChange, 
  placeholder 
}: { 
  items: string[]; 
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const { t } = useLocale();
  
  const addItem = () => {
    onChange([...items, '']);
  };
  
  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };
  
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <span className="flex-shrink-0 w-6 text-muted-foreground text-sm pt-2">{i + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            onClick={() => removeItem(i)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
        <Plus className="h-3 w-3" />
        {t.plans.addItem}
      </Button>
    </div>
  );
}

export function PlanEditor({ 
  planType, 
  initialData, 
  onSave, 
  onCancel, 
  isSaving 
}: PlanEditorProps) {
  const { t, locale } = useLocale();
  const [plan, setPlan] = useState<PlanData>(() => 
    initialData || createEmptyPlan(planType, locale)
  );
  
  useEffect(() => {
    if (initialData) {
      setPlan(initialData);
    }
  }, [initialData]);
  
  const handleSave = () => {
    const updatedPlan: PlanData = {
      ...plan,
      meta: {
        ...plan.meta,
        updatedAt: new Date().toISOString(),
      },
    };
    onSave(updatedPlan);
  };
  
  const title = planType === 'A' ? t.plans.planA : t.plans.planB;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container-wide section-padding py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">{title}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? t.common.loading : t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="container-wide section-padding py-6 space-y-6 max-w-4xl">
        {/* Triggers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t.plans.sections.triggers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChipInput
              items={plan.triggers}
              onChange={(triggers) => setPlan({ ...plan, triggers })}
              placeholder={t.plans.placeholders.trigger}
            />
          </CardContent>
        </Card>
        
        {/* Objectives */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              {t.plans.sections.objectives}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChipInput
              items={plan.objectives}
              onChange={(objectives) => setPlan({ ...plan, objectives })}
              placeholder={t.plans.placeholders.objective}
            />
          </CardContent>
        </Card>
        
        {/* Meeting Points */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-emerald-500" />
              {t.plans.sections.meetingPoints}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.primaryPoint}</label>
              <Input
                value={plan.meetingPoints.primary}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  meetingPoints: { ...plan.meetingPoints, primary: e.target.value }
                })}
                placeholder={t.plans.placeholders.meetingPoint}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.secondaryPoint}</label>
              <Input
                value={plan.meetingPoints.secondary}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  meetingPoints: { ...plan.meetingPoints, secondary: e.target.value }
                })}
                placeholder={t.plans.placeholders.meetingPoint}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Contacts (names only) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-500" />
              {t.plans.sections.contacts}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t.plans.contactsNote}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.primaryContact}</label>
              <Input
                value={plan.contacts.primary}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  contacts: { ...plan.contacts, primary: e.target.value }
                })}
                placeholder={t.plans.placeholders.contactName}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.secondaryContact}</label>
              <Input
                value={plan.contacts.secondary}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  contacts: { ...plan.contacts, secondary: e.target.value }
                })}
                placeholder={t.plans.placeholders.contactName}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.outOfAreaContact}</label>
              <Input
                value={plan.contacts.outOfArea}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  contacts: { ...plan.contacts, outOfArea: e.target.value }
                })}
                placeholder={t.plans.placeholders.contactName}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Mobility */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Accessibility className="h-4 w-4 text-purple-500" />
              {t.plans.sections.mobility}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.constraints}</label>
              <Input
                value={plan.mobility.constraints}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  mobility: { ...plan.mobility, constraints: e.target.value }
                })}
                placeholder={t.plans.placeholders.constraints}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.transport}</label>
              <Input
                value={plan.mobility.transport}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  mobility: { ...plan.mobility, transport: e.target.value }
                })}
                placeholder={t.plans.placeholders.transport}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.plans.labels.mobilityNotes}</label>
              <Textarea
                value={plan.mobility.notes}
                onChange={(e) => setPlan({ 
                  ...plan, 
                  mobility: { ...plan.mobility, notes: e.target.value }
                })}
                placeholder={t.plans.placeholders.notes}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Essentials Grab List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-orange-500" />
              {t.plans.sections.grabList}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListInput
              items={plan.essentialsGrabList}
              onChange={(essentialsGrabList) => setPlan({ ...plan, essentialsGrabList })}
              placeholder={t.plans.placeholders.grabItem}
            />
          </CardContent>
        </Card>
        
        {/* Steps: First Hour */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-red-500" />
              {t.plans.sections.firstHour}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListInput
              items={plan.stepsFirstHour}
              onChange={(stepsFirstHour) => setPlan({ ...plan, stepsFirstHour })}
              placeholder={t.plans.placeholders.step}
            />
          </CardContent>
        </Card>
        
        {/* Steps: First Day */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-indigo-500" />
              {t.plans.sections.firstDay}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ListInput
              items={plan.stepsFirstDay}
              onChange={(stepsFirstDay) => setPlan({ ...plan, stepsFirstDay })}
              placeholder={t.plans.placeholders.step}
            />
          </CardContent>
        </Card>
        
        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-slate-500" />
              {t.plans.sections.notes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={plan.notes}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
              placeholder={t.plans.placeholders.notes}
              rows={4}
            />
          </CardContent>
        </Card>
        
        {/* Bottom save bar */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? t.common.loading : t.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
