import React from 'react';
import { ChevronDown, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { STEP_ICONS, COUNTRY_LIST, SECTION_LABELS } from './schema';
import type { WizardStep as StepType, StepOption } from './schema';
import type { WizardAnswers } from './types';
import { getIllustration } from './WizardIllustrations';

interface WizardStepProps {
  step: StepType;
  answers: WizardAnswers;
  onUpdateAnswer: (key: string, value: string | string[]) => void;
  sectionId: string;
  sectionIntro?: string;
  sectionTitle?: string;
}

export default function WizardStep({
  step,
  answers,
  onUpdateAnswer,
  sectionId,
  sectionIntro,
  sectionTitle,
}: WizardStepProps) {
  const [helperOpen, setHelperOpen] = React.useState(false);
  
  const IconComponent = STEP_ICONS[step.icon];
  const IllustrationComponent = getIllustration(step.image);
  const sectionLabel = SECTION_LABELS[sectionId] || sectionId.toUpperCase();
  
  // Get current answer value
  const getValue = (key: string): string | string[] | undefined => {
    return (answers as unknown as Record<string, string | string[]>)[key];
  };
  
  const handleSingleSelect = (value: string) => {
    onUpdateAnswer(step.id, value);
  };
  
  const handleMultiSelect = (value: string) => {
    const currentValues = (getValue(step.id) as string[]) || [];
    
    // Handle "none" option exclusivity
    if (step.multiBehavior?.noneExcludesOthers && value === 'none') {
      onUpdateAnswer(step.id, ['none']);
      return;
    }
    
    // If selecting something else while "none" is selected, remove "none"
    const filteredValues = currentValues.filter(v => v !== 'none');
    
    if (filteredValues.includes(value)) {
      // Remove value
      const newValues = filteredValues.filter(v => v !== value);
      onUpdateAnswer(step.id, newValues.length > 0 ? newValues : []);
    } else {
      // Add value
      onUpdateAnswer(step.id, [...filteredValues, value]);
    }
  };
  
  const handleFieldChange = (fieldKey: string, value: string) => {
    onUpdateAnswer(fieldKey, value);
  };
  
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Section label badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10">
          {sectionLabel}
        </span>
      </div>

      {/* Section intro (shown only for first step in section) */}
      {sectionIntro && sectionTitle && (
        <div className="mb-5 pb-4 border-b border-border/50">
          <h3 className="text-base font-semibold text-foreground mb-1">
            {sectionTitle}
          </h3>
          <p className="text-sm text-muted-foreground">{sectionIntro}</p>
        </div>
      )}
      
      {/* Step header with illustration */}
      <div className="flex items-start gap-4 mb-5">
        {/* Icon circle */}
        <div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16">
          {IllustrationComponent ? (
            <IllustrationComponent />
          ) : IconComponent ? (
            <div className="w-full h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
              <IconComponent className="w-7 h-7 text-primary" />
            </div>
          ) : null}
        </div>
        
        {/* Title and helper */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-foreground mb-2 leading-snug">
            {step.title}
          </h2>
          
          {/* Collapsible helper - always visible compact */}
          <Collapsible open={helperOpen} onOpenChange={setHelperOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
              <Info className="h-3.5 w-3.5" />
              <span className="group-hover:underline">Why we ask</span>
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform duration-200",
                helperOpen && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 animate-in slide-in-from-top-2 duration-200">
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
                {step.helper}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
      
      {/* Divider before options */}
      <Separator className="my-4 bg-border/50" />
      
      {/* Step content based on type */}
      <div className="mt-4">
        {step.type === 'location' && step.fields && (
          <LocationFields 
            fields={step.fields}
            answers={answers}
            onChange={handleFieldChange}
          />
        )}
        
        {step.type === 'single' && step.options && (
          <SingleSelectOptions
            options={step.options}
            selectedValue={getValue(step.id) as string}
            onSelect={handleSingleSelect}
          />
        )}
        
        {step.type === 'multi' && step.options && (
          <MultiSelectOptions
            options={step.options}
            selectedValues={(getValue(step.id) as string[]) || []}
            onToggle={handleMultiSelect}
          />
        )}
      </div>
    </div>
  );
}

// Location fields component
function LocationFields({
  fields,
  answers,
  onChange,
}: {
  fields: Array<{ key: string; label: string; kind: string; required: boolean; placeholder?: string; options?: string }>;
  answers: WizardAnswers;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <Label className="text-sm font-medium text-foreground mb-1.5 block">
            {field.label}
            {!field.required && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
          </Label>
          
          {field.kind === 'select' && field.options === 'COUNTRY_LIST' ? (
            <Select 
              value={(answers as unknown as Record<string, string>)[field.key] || ''}
              onValueChange={(value) => onChange(field.key, value)}
            >
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Select a country..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {COUNTRY_LIST.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder={field.placeholder}
              value={(answers as unknown as Record<string, string>)[field.key] || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full h-12"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Single select options with visual feedback
function SingleSelectOptions({
  options,
  selectedValue,
  onSelect,
}: {
  options: StepOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-150 text-left group",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <span className={cn(
              "font-medium text-sm transition-colors",
              isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {option.label}
            </span>
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              isSelected 
                ? "border-primary bg-primary" 
                : "border-muted-foreground/30 group-hover:border-primary/50"
            )}>
              {isSelected && (
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Multi select options as pills
function MultiSelectOptions({
  options,
  selectedValues,
  onToggle,
}: {
  options: StepOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={cn(
              "px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
