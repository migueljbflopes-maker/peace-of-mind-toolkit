import React from 'react';
import { RotateCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResumeModalProps {
  open: boolean;
  onResume: () => void;
  onStartFresh: () => void;
}

export default function ResumeModal({ open, onResume, onStartFresh }: ResumeModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Continue where you left off?</DialogTitle>
          <DialogDescription>
            We found your previous progress. Would you like to resume or start fresh?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 mt-4">
          <Button onClick={onResume} className="w-full">
            <Play className="mr-2 h-4 w-4" />
            Continue where I left off
          </Button>
          
          <Button variant="outline" onClick={onStartFresh} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start fresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
