import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Clock } from "lucide-react";

export default function WeeklyBriefing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-lg mx-auto px-4 py-16 text-center">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-6">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Weekly Briefing
          </h1>
          <p className="text-muted-foreground text-lg mb-2">
            Coming Soon
          </p>
          <p className="text-sm text-muted-foreground">
            A curated summary of global developments — filtered, neutral, and actionable.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
