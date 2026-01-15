import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageSquare, Lock } from "lucide-react";

export function PanicQuickAccessLocked() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Premium Feature</p>
          <Link to="/pricing">
            <Button size="sm">Unlock for €49</Button>
          </Link>
        </div>
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-5 w-5" />
          Emergency Panic Button
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-24 h-24 rounded-full border-4 border-muted bg-muted/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Alert your emergency contacts instantly</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpertQALocked() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Premium Feature</p>
          <Link to="/pricing">
            <Button size="sm">Unlock for €49</Button>
          </Link>
        </div>
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-5 w-5" />
          Ask a Security Expert
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 opacity-40">
          <div className="h-10 rounded bg-muted" />
          <div className="h-20 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
