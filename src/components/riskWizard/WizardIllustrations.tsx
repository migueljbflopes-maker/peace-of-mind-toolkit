/**
 * Simple SVG illustrations for wizard steps
 * These are placeholder illustrations that can be replaced with richer assets
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

const baseStyle = "w-full h-full";

export function LocationIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M60 25c-13.8 0-25 11.2-25 25 0 19 25 40 25 40s25-21 25-40c0-13.8-11.2-25-25-25z" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="60" cy="48" r="10" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function HomeIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M30 55l30-25 30 25v35H30V55z" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="50" y="65" width="20" height="25" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="38" y="55" width="12" height="10" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
      <rect x="70" y="55" width="12" height="10" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
    </svg>
  );
}

export function MobilityIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M25 70h70" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="60" cy="55" rx="25" ry="15" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="42" cy="70" r="8" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="78" cy="70" r="8" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <path d="M80 45l10-10M90 45l-5-10" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function HouseholdIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <circle cx="40" cy="45" r="12" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="80" cy="45" r="12" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="60" cy="75" r="10" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <path d="M40 60v20M80 60v20" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
      <path d="M50 75h20" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function CareIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M60 85s-25-15-25-35c0-12 10-18 18-18 5 0 7 3 7 3s2-3 7-3c8 0 18 6 18 18 0 20-25 35-25 35z" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <path d="M50 55l5 5 10-10" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function PetsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <ellipse cx="60" cy="65" rx="20" ry="15" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="48" cy="50" r="6" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="72" cy="50" r="6" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="60" cy="38" r="5" fill="hsl(var(--primary) / 0.4)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="45" cy="80" r="5" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="75" cy="80" r="5" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
    </svg>
  );
}

export function WaterIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M60 30c-15 20-25 35-25 45 0 14 11 20 25 20s25-6 25-20c0-10-10-25-25-45z" fill="hsl(var(--primary) / 0.25)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <path d="M50 70q10 5 20 0" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 78q8 3 16 0" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function FoodIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <rect x="40" y="35" width="40" height="50" rx="3" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <line x1="40" y1="50" x2="80" y2="50" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="48" y="58" width="24" height="4" rx="1" fill="hsl(var(--primary) / 0.4)"/>
      <rect x="48" y="66" width="18" height="4" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <rect x="48" y="74" width="20" height="4" rx="1" fill="hsl(var(--primary) / 0.35)"/>
    </svg>
  );
}

export function PowerIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M55 30L45 60h15l-10 30 25-35H60l10-25H55z" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

export function CashIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <rect x="30" y="40" width="60" height="40" rx="4" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="60" cy="60" r="12" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <text x="60" y="65" textAnchor="middle" fill="hsl(var(--primary))" fontSize="14" fontWeight="bold">€</text>
    </svg>
  );
}

export function DocsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <rect x="38" y="30" width="44" height="60" rx="2" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="45" y="42" width="30" height="4" rx="1" fill="hsl(var(--primary) / 0.4)"/>
      <rect x="45" y="52" width="25" height="3" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <rect x="45" y="60" width="28" height="3" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <rect x="45" y="68" width="20" height="3" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <path d="M68 78l4 4 8-8" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function CommsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <rect x="35" y="40" width="50" height="35" rx="5" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="50" cy="57" r="10" fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="65" y="48" width="15" height="3" rx="1" fill="hsl(var(--primary) / 0.4)"/>
      <rect x="65" y="54" width="12" height="3" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <rect x="65" y="60" width="14" height="3" rx="1" fill="hsl(var(--primary) / 0.35)"/>
      <path d="M55 30c5-5 15-5 20 0M50 37c7-5 18-5 25 0" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function PlanIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <rect x="35" y="30" width="50" height="60" rx="3" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="42" y="40" width="36" height="5" rx="1" fill="hsl(var(--primary) / 0.4)"/>
      <circle cx="45" cy="55" r="3" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="52" y="53" width="22" height="4" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <path d="M43 67l2 2 5-5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="52" y="65" width="18" height="4" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <circle cx="45" cy="79" r="3" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <rect x="52" y="77" width="24" height="4" rx="1" fill="hsl(var(--primary) / 0.3)"/>
    </svg>
  );
}

export function KitIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" className={cn(baseStyle, className)} fill="none">
      <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.1)" />
      <path d="M40 45h40v40c0 3-3 5-5 5H45c-2 0-5-2-5-5V45z" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <path d="M45 45v-5c0-5 5-10 15-10s15 5 15 10v5" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
      <rect x="50" y="55" width="20" height="4" rx="1" fill="hsl(var(--primary) / 0.4)"/>
      <rect x="50" y="63" width="16" height="3" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <rect x="50" y="70" width="18" height="3" rx="1" fill="hsl(var(--primary) / 0.3)"/>
      <rect x="50" y="77" width="12" height="3" rx="1" fill="hsl(var(--primary) / 0.25)"/>
    </svg>
  );
}

// Map image keys to components
const illustrationMap: Record<string, React.FC<IllustrationProps>> = {
  'illustration-location': LocationIllustration,
  'illustration-home': HomeIllustration,
  'illustration-mobility': MobilityIllustration,
  'illustration-household': HouseholdIllustration,
  'illustration-care': CareIllustration,
  'illustration-pets': PetsIllustration,
  'illustration-water': WaterIllustration,
  'illustration-food': FoodIllustration,
  'illustration-power': PowerIllustration,
  'illustration-cash': CashIllustration,
  'illustration-docs': DocsIllustration,
  'illustration-comms': CommsIllustration,
  'illustration-plan': PlanIllustration,
  'illustration-kit': KitIllustration,
};

export function getIllustration(imageKey: string): React.FC<IllustrationProps> | null {
  return illustrationMap[imageKey] || null;
}

export default illustrationMap;
