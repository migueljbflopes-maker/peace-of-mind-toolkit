import React from 'react';
import { ChevronDown, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { STEP_ICONS, COUNTRY_LIST } from './schema';
import type { WizardStep as StepType, StepOption } from './schema';
import type { WizardAnswers } from './types';
import { getIllustration } from './WizardIllustrations';

interface WizardStepProps {
  step: StepType;
  answers: WizardAnswers;
  onUpdateAnswer: (key: string, value: string | string[]) => void;
  sectionIntro?: string;
  sectionTitle?: string;
}

export default function WizardStep({
  step,
  answers,
  onUpdateAnswer,
  sectionIntro,
  sectionTitle,
}: WizardStepProps) {
  const [helperOpen, setHelperOpen] = React.useState(false);
  
  const IconComponent = STEP_ICONS[step.icon];
  const IllustrationComponent = getIllustration(step.image);
  
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
    <div className="space-y-4">
      {/* Section intro (shown only for first step in section) */}
      {sectionIntro && sectionTitle && (
        <div className="mb-6 pb-4 border-b border-border/50">
          <h3 className="text-sm font-medium text-primary uppercase tracking-wide mb-1">
            {sectionTitle}
          </h3>
          <p className="text-sm text-muted-foreground">{sectionIntro}</p>
        </div>
      )}
      
      {/* Step header with illustration */}
      <div className="flex items-start gap-4 mb-6">
        {/* Illustration */}
        <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24">
          {IllustrationComponent ? (
            <IllustrationComponent />
          ) : IconComponent ? (
            <div className="w-full h-full flex items-center justify-center rounded-2xl bg-primary/10">
              <IconComponent className="w-10 h-10 text-primary" />
            </div>
          ) : null}
        </div>
        
        {/* Title and helper */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1 leading-tight">
            {step.title}
          </h2>
          
          {/* Collapsible helper */}
          <Collapsible open={helperOpen} onOpenChange={setHelperOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Info className="h-3 w-3" />
              <span>Why we ask</span>
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                helperOpen && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {step.helper}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
      
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
            {!field.required && <span className="text-muted-foreground ml-1">(optional)</span>}
          </Label>
          
          {field.kind === 'select' && field.options === 'COUNTRY_LIST' ? (
            <Select 
              value={(answers as unknown as Record<string, string>)[field.key] || ''}
              onValueChange={(value) => onChange(field.key, value)}
            >
              <SelectTrigger className="w-full">
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
              className="w-full"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Single select options
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
    <div className="grid gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className={cn(
            "flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
            selectedValue === option.value
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <span className={cn(
            "font-medium text-sm",
            selectedValue === option.value ? "text-foreground" : "text-muted-foreground"
          )}>
            {option.label}
          </span>
          {selectedValue === option.value && (
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

// Multi select options
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
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={cn(
              "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50 text-muted-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
