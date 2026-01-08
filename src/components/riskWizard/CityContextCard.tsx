import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CityContextCardProps {
  city?: string;
  postalCode?: string;
  locationDrivers?: string[];
  isLoading?: boolean;
}

export default function CityContextCard({
  city,
  postalCode,
  locationDrivers,
  isLoading = false,
}: CityContextCardProps) {
  const locationLabel = [city, postalCode].filter(Boolean).join(', ');

  // If no location provided
  if (!city && !postalCode) {
    return null;
  }

  return (
    <Card className="p-4 mb-4 bg-background border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Why this score for {locationLabel}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            <span>Generating location context…</span>
          </div>
        </div>
      ) : locationDrivers && locationDrivers.length > 0 ? (
        <ul className="space-y-2">
          {locationDrivers.slice(0, 5).map((driver, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-2 flex-shrink-0" />
              <span>{driver}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">
              No location context available yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your score is based on your preparedness answers.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
