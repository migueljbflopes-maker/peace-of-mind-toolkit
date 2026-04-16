import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RiskWizardUI } from "@/components/riskWizard";

// Feature flag: use new wizard UI if ?ui=wizard or set to true for full rollout
const USE_WIZARD_BY_DEFAULT = true;
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Building2,
  Users,
  Heart,
  Car,
  AlertTriangle,
  CheckCircle2,
  Home,
  TreePine,
  Mountain,
  Sparkles,
  WifiOff,
  FileText,
  Lock,
  Shield,
  ClipboardList,
  Contact,
  Stethoscope,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/modals/LoginModal";
import { PaywallModal } from "@/components/modals/PaywallModal";
import { useEntitlements } from "@/hooks/useEntitlements";

const STORAGE_KEY = "resilient_risk_quiz_draft";
const RESULT_KEY = "resilient_risk_result";
const TOTAL_STEPS = 7;

const COUNTRIES = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Switzerland",
  "Norway",
  "Iceland",
].sort();

interface QuizAnswers {
  country: string;
  city: string;
  areaType: string;
  nearInfrastructure: string;
  householdSize: string;
  extraSupport: string[];
  mobility: string;
}

interface Breakdown {
  location_context: number;
  household_complexity: number;
  mobility_constraints: number;
  preparedness_autonomy: number;
}

interface RiskResult {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  inputs: QuizAnswers;
  breakdown: Breakdown;
  updatedAt: string;
}

interface AiInsights {
  summary: string;
  dimension_notes: string[];
  next_steps: string[];
}

const defaultAnswers: QuizAnswers = {
  country: "",
  city: "",
  areaType: "",
  nearInfrastructure: "",
  householdSize: "",
  extraSupport: [],
  mobility: "",
};

// Placeholder for future AI integration
async function fetchAiInsights(payload: {
  score: number;
  risk_level: string;
  inputs: Record<string, unknown>;
  breakdown_0_100: Breakdown;
}): Promise<AiInsights> {
  // Log payload for debugging (in-memory only)
  console.log("AI Insights payload:", payload);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Return placeholder response
  return {
    summary:
      "Based on your profile, focusing on household supplies and a clear communication plan would strengthen your preparedness.",
    dimension_notes: [
      "Your location may face infrastructure-related disruptions.",
      "Larger households benefit from delegating preparedness tasks.",
    ],
    next_steps: [
      "Build a 14-day supplies plan tailored to your household.",
      "Identify two meeting points for your family.",
      "Store important documents in an accessible location.",
    ],
  };
}

export default function RiskCalculator() {
  const [searchParams] = useSearchParams();

  // Feature flag check: use wizard if query param or default flag is set
  const useWizard =
    searchParams.get("ui") === "wizard" || (USE_WIZARD_BY_DEFAULT && searchParams.get("ui") !== "legacy");

  // If using wizard, render it instead of the legacy UI.
  // Legacy UI is isolated in a sub-component so its hooks are never conditionally invoked.
  if (useWizard) {
    return <RiskWizardUI />;
  }

  return <RiskCalculatorLegacy />;
}

function RiskCalculatorLegacy() {
  const navigate = useNavigate();
  const { isPremium } = useEntitlements();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(defaultAnswers);
  const [showResults, setShowResults] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.step) setStep(parsed.step);
      } catch (e) {
        console.error("Failed to parse saved quiz data");
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step }));
  }, [answers, step]);

  const updateAnswer = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleExtraSupport = (value: string) => {
    setAnswers((prev) => {
      if (value === "None") {
        return { ...prev, extraSupport: ["None"] };
      }
      const current = prev.extraSupport.filter((v) => v !== "None");
      if (current.includes(value)) {
        return { ...prev, extraSupport: current.filter((v) => v !== value) };
      }
      return { ...prev, extraSupport: [...current, value] };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return answers.country !== "";
      case 2:
        return true;
      case 3:
        return answers.areaType !== "";
      case 4:
        return answers.nearInfrastructure !== "";
      case 5:
        return answers.householdSize !== "";
      case 6:
        return answers.extraSupport.length > 0;
      case 7:
        return answers.mobility !== "";
      default:
        return false;
    }
  };

  // Calculate 4-dimension breakdown
  const calculateBreakdown = (): Breakdown => {
    // Location context (area type + infrastructure proximity)
    let locationContext = 20;
    switch (answers.areaType) {
      case "Urban":
        locationContext += 25;
        break;
      case "Suburban":
        locationContext += 15;
        break;
      case "Rural":
        locationContext += 5;
        break;
      case "Remote":
        locationContext += 10;
        break;
    }
    switch (answers.nearInfrastructure) {
      case "Yes":
        locationContext += 40;
        break;
      case "Not sure":
        locationContext += 20;
        break;
      case "No":
        locationContext += 5;
        break;
    }

    // Household complexity (size + extra support needs)
    let householdComplexity = 10;
    switch (answers.householdSize) {
      case "1":
        householdComplexity += 5;
        break;
      case "2":
        householdComplexity += 15;
        break;
      case "3–4":
        householdComplexity += 30;
        break;
      case "5–6":
        householdComplexity += 45;
        break;
      case "7+":
        householdComplexity += 55;
        break;
    }
    if (answers.extraSupport.includes("Kids")) householdComplexity += 10;
    if (answers.extraSupport.includes("Elderly")) householdComplexity += 10;
    if (answers.extraSupport.includes("Medical needs")) householdComplexity += 15;
    if (answers.extraSupport.includes("Pets")) householdComplexity += 5;

    // Mobility constraints
    let mobilityConstraints = 15;
    switch (answers.mobility) {
      case "Car available":
        mobilityConstraints += 10;
        break;
      case "Public transport only":
        mobilityConstraints += 45;
        break;
      case "Limited mobility":
        mobilityConstraints += 70;
        break;
    }

    // Preparedness autonomy (derived from complexity + mobility as proxy)
    const autonomyNeed = Math.round((householdComplexity + mobilityConstraints) / 2);
    const preparednessAutonomy = Math.min(100, Math.max(30, autonomyNeed + 15));

    return {
      location_context: Math.min(100, locationContext),
      household_complexity: Math.min(100, householdComplexity),
      mobility_constraints: Math.min(100, mobilityConstraints),
      preparedness_autonomy: preparednessAutonomy,
    };
  };

  // Calculate overall score
  const calculateScore = () => {
    let score = 30;

    switch (answers.areaType) {
      case "Urban":
        score += 10;
        break;
      case "Suburban":
        score += 5;
        break;
      case "Remote":
        score += 5;
        break;
    }

    switch (answers.nearInfrastructure) {
      case "Yes":
        score += 25;
        break;
      case "Not sure":
        score += 12;
        break;
    }

    switch (answers.householdSize) {
      case "2":
        score += 5;
        break;
      case "3–4":
        score += 10;
        break;
      case "5–6":
        score += 15;
        break;
      case "7+":
        score += 20;
        break;
    }

    if (answers.extraSupport.includes("Kids")) score += 5;
    if (answers.extraSupport.includes("Elderly")) score += 5;
    if (answers.extraSupport.includes("Medical needs")) score += 10;
    if (answers.extraSupport.includes("Pets")) score += 3;

    switch (answers.mobility) {
      case "Public transport only":
        score += 8;
        break;
      case "Limited mobility":
        score += 12;
        break;
    }

    return Math.min(100, Math.max(0, score));
  };

  const getRiskLevel = (score: number): "Low" | "Medium" | "High" => {
    if (score < 40) return "Low";
    if (score < 70) return "Medium";
    return "High";
  };

  const getScoreStyle = (level: string) => {
    switch (level) {
      case "Low":
        return { color: "text-green-600", bg: "bg-green-100", border: "border-green-200" };
      case "Medium":
        return { color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" };
      case "High":
        return { color: "text-red-600", bg: "bg-red-100", border: "border-red-200" };
      default:
        return { color: "text-muted-foreground", bg: "bg-muted", border: "border-border" };
    }
  };

  // Generate default explanation based on top drivers
  const generateDefaultExplanation = (breakdown: Breakdown): { explanation: string; priorities: string[] } => {
    const drivers = [
      {
        key: "location_context",
        label: "location context",
        value: breakdown.location_context,
        priority: "Review local emergency resources and alert systems.",
      },
      {
        key: "household_complexity",
        label: "household complexity",
        value: breakdown.household_complexity,
        priority: "Create a household communication plan with clear roles.",
      },
      {
        key: "mobility_constraints",
        label: "mobility situation",
        value: breakdown.mobility_constraints,
        priority: "Identify accessible evacuation routes and backup transport options.",
      },
      {
        key: "preparedness_autonomy",
        label: "self-reliance needs",
        value: breakdown.preparedness_autonomy,
        priority: "Build a 14-day supplies reserve tailored to your household.",
      },
    ].sort((a, b) => b.value - a.value);

    const top1 = drivers[0];
    const top2 = drivers[1];
    const top3 = drivers[2];

    const explanation = `Your assessment highlights ${top1.label} and ${top2.label} as key factors to consider. A practical preparedness plan can help you feel confident and ready, no matter the situation.`;

    const priorities = [top1.priority, top2.priority, top3.priority];

    return { explanation, priorities };
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Calculate and save results
      const score = calculateScore();
      const breakdown = calculateBreakdown();
      const riskLevel = getRiskLevel(score);

      const result: RiskResult = {
        score,
        riskLevel,
        inputs: answers,
        breakdown,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(RESULT_KEY, JSON.stringify(result));
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
      setAiInsights(null);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFetchAiInsights = async () => {
    if (!isOnline) return;

    setAiLoading(true);
    try {
      const breakdown = calculateBreakdown();
      const payload = {
        score: calculateScore(),
        risk_level: getRiskLevel(calculateScore()),
        inputs: {
          country: answers.country,
          city: answers.city,
          area_type: answers.areaType,
          near_critical_infrastructure: answers.nearInfrastructure,
          household_size_bucket: answers.householdSize,
          extra_support: answers.extraSupport,
          mobility: answers.mobility,
          days_target: 14,
        },
        breakdown_0_100: breakdown,
      };

      const insights = await fetchAiInsights(payload);
      setAiInsights(insights);
    } catch (error) {
      console.error("Failed to fetch AI insights:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredCountries = COUNTRIES.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()));

  const resetQuiz = () => {
    setAnswers(defaultAnswers);
    setStep(1);
    setShowResults(false);
    setAiInsights(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULT_KEY);
  };

  if (showResults) {
    const score = calculateScore();
    const riskLevel = getRiskLevel(score);
    const breakdown = calculateBreakdown();
    const scoreStyle = getScoreStyle(riskLevel);
    const { explanation, priorities } = generateDefaultExplanation(breakdown);

    const breakdownItems = [
      { key: "location_context", label: "Location context", value: breakdown.location_context },
      { key: "household_complexity", label: "Household complexity", value: breakdown.household_complexity },
      { key: "mobility_constraints", label: "Mobility constraints", value: breakdown.mobility_constraints },
      { key: "preparedness_autonomy", label: "Preparedness autonomy", value: breakdown.preparedness_autonomy },
    ];

    const premiumPreviewItems = [
      { icon: ClipboardList, label: "Plan Summary" },
      { icon: Contact, label: "Contacts" },
      { icon: Stethoscope, label: "Medical" },
      { icon: CheckCircle2, label: "Essentials Checklist" },
      { icon: Route, label: "Plans A/B" },
    ];

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={handleBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-semibold text-foreground">Your Risk Assessment</h1>
          </div>

          {/* Score Card - Compact */}
          <Card className="p-4 mb-4 bg-[#F8FAFC] border-border/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary/20">
                <span className="text-2xl font-bold text-foreground">{score}</span>
              </div>
              <div>
                <div
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    scoreStyle.bg,
                    scoreStyle.color,
                    scoreStyle.border,
                    "border",
                  )}
                >
                  {riskLevel} Risk Level
                </div>
              </div>
            </div>

            {/* 4-Dimension Breakdown Bars */}
            <div className="space-y-2">
              {breakdownItems.map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-foreground font-medium">{item.value}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-900"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* What This Means */}
          <Card className="p-4 mb-4 bg-background border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-2">What this means</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
          </Card>

          {/* Top Priorities */}
          <Card className="p-4 mb-5 bg-background border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top priorities</h3>
            <ul className="space-y-2">
              {priorities.map((priority, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Premium Conversion Block - Centerpiece (only for non-premium users) */}
          {isPremium ? (
            <Card className="p-5 mb-5 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Your Premium Features</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Continue building your personalized plan with your premium tools.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { icon: Lock, label: "Vault", href: "/premium/vault" },
                  { icon: Route, label: "Plans A & B", href: "/premium/plans" },
                  { icon: FileText, label: "Red Folder", href: "/premium/red-folder" },
                  { icon: Shield, label: "Backup", href: "/premium/backup" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(item.href)}
                    className="flex items-center gap-2 p-3 rounded-lg bg-background/60 border border-border/50 hover:border-primary/50 transition-colors text-left"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
              <Button onClick={() => navigate("/premium/plans")} className="w-full">
                Continue to Plans
              </Button>
            </Card>
          ) : (
            <Card className="p-5 mb-5 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/8 to-primary/5 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Personalized Resiliency Plan</h3>
                <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                  Premium
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Printable offline PDF + encrypted Vault + Plans A & B.
              </p>

              {/* Price badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                  €49 one-time
                </span>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                  No subscription
                </span>
              </div>

              {/* Feature list */}
              <ul className="space-y-2 mb-4">
                {[
                  "Printable offline 'Red Folder' PDF",
                  "Encrypted Vault (IDs, contacts, medical basics)",
                  "Plans A & B (exit + emergency)",
                  "Encrypted backup & restore",
                  "Premium insights (personalized explanation + next steps)",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Preview grid */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {premiumPreviewItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center p-2 rounded-lg bg-background/60 border border-border/50"
                  >
                    <item.icon className="h-5 w-5 text-primary/70 mb-1" />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* AI Insights as Premium feature */}
              <div className="p-3 rounded-lg bg-background/50 border border-primary/10 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Included: Personalized explanation & next steps
                  </span>
                  <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary">
                    <Lock className="h-3 w-3" />
                    Premium
                  </span>
                </div>
                {!isOnline && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <WifiOff className="h-3 w-3" />
                    <span>Unavailable offline</span>
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <Button className="w-full mb-2" size="lg" onClick={() => setShowPaywallModal(true)}>
                <Shield className="mr-2 h-4 w-4" />
                Generate my Resiliency Plan (€49)
              </Button>

              {/* Secondary link */}
              <button
                onClick={() => navigate("/tools/supplies")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                Not now
              </button>
            </Card>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center mb-4">
            This is a planning aid — always follow local authorities' guidance.
          </p>

          {/* Save link (low prominence) */}
          <div className="text-center">
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Save & continue later
            </button>
          </div>
        </div>

        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
        <PaywallModal open={showPaywallModal} onOpenChange={setShowPaywallModal} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Header with progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => (step > 1 ? handleBack() : navigate("/be-prepared"))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="w-9" />
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {step === 1 && (
            <StepContainer
              icon={<MapPin className="h-6 w-6 text-primary" />}
              title="Where are you located?"
              subtitle="Select your country to personalize your assessment."
            >
              <Input
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="mb-4"
              />
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country}
                    onClick={() => updateAnswer("country", country)}
                    className={cn(
                      "p-3 text-left text-sm rounded-xl border transition-all",
                      answers.country === country
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background hover:border-primary/50 text-muted-foreground",
                    )}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </StepContainer>
          )}

          {step === 2 && (
            <StepContainer
              icon={<Building2 className="h-6 w-6 text-primary" />}
              title="What city or area?"
              subtitle="Optional — helps refine local recommendations."
            >
              <Input
                placeholder="Enter your city..."
                value={answers.city}
                onChange={(e) => updateAnswer("city", e.target.value)}
                className="mb-3"
              />
              <button
                onClick={() => {
                  updateAnswer("city", "");
                  handleNext();
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Skip this step
              </button>
            </StepContainer>
          )}

          {step === 3 && (
            <StepContainer
              icon={<Home className="h-6 w-6 text-primary" />}
              title="What type of area do you live in?"
              subtitle="This affects the types of risks you may face."
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "Urban", icon: Building2, desc: "City center" },
                  { value: "Suburban", icon: Home, desc: "Town or outskirts" },
                  { value: "Rural", icon: TreePine, desc: "Countryside" },
                  { value: "Remote", icon: Mountain, desc: "Isolated area" },
                ].map((option) => (
                  <OptionCard
                    key={option.value}
                    selected={answers.areaType === option.value}
                    onClick={() => updateAnswer("areaType", option.value)}
                    icon={<option.icon className="h-5 w-5" />}
                    label={option.value}
                    description={option.desc}
                  />
                ))}
              </div>
            </StepContainer>
          )}

          {step === 4 && (
            <StepContainer
              icon={<AlertTriangle className="h-6 w-6 text-primary" />}
              title="Near critical infrastructure?"
              subtitle="e.g., airports, major ports, large energy sites"
            >
              <div className="grid gap-3">
                {["No", "Not sure", "Yes"].map((option) => (
                  <OptionCard
                    key={option}
                    selected={answers.nearInfrastructure === option}
                    onClick={() => updateAnswer("nearInfrastructure", option)}
                    label={option}
                    horizontal
                  />
                ))}
              </div>
            </StepContainer>
          )}

          {step === 5 && (
            <StepContainer
              icon={<Users className="h-6 w-6 text-primary" />}
              title="How many people in your household?"
              subtitle="Include everyone who lives with you."
            >
              <div className="flex flex-wrap gap-3 justify-center">
                {["1", "2", "3–4", "5–6", "7+"].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateAnswer("householdSize", option)}
                    className={cn(
                      "w-16 h-16 rounded-xl border text-lg font-medium transition-all",
                      answers.householdSize === option
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background hover:border-primary/50 text-muted-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </StepContainer>
          )}

          {step === 6 && (
            <StepContainer
              icon={<Heart className="h-6 w-6 text-primary" />}
              title="Anyone needing extra support?"
              subtitle="Select all that apply."
            >
              <div className="flex flex-wrap gap-2 justify-center">
                {["None", "Kids", "Elderly", "Medical needs", "Pets"].map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleExtraSupport(option)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                      answers.extraSupport.includes(option)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50 text-muted-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </StepContainer>
          )}

          {step === 7 && (
            <StepContainer
              icon={<Car className="h-6 w-6 text-primary" />}
              title="What's your mobility situation?"
              subtitle="This helps plan evacuation options."
            >
              <div className="grid gap-3">
                {[
                  { value: "Car available", icon: Car },
                  { value: "Public transport only", icon: Building2 },
                  { value: "Limited mobility", icon: Users },
                ].map((option) => (
                  <OptionCard
                    key={option.value}
                    selected={answers.mobility === option.value}
                    onClick={() => updateAnswer("mobility", option.value)}
                    icon={<option.icon className="h-5 w-5" />}
                    label={option.value}
                    horizontal
                  />
                ))}
              </div>
            </StepContainer>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} disabled={step === 1} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
            {step === TOTAL_STEPS ? "See Results" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepContainer({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">{icon}</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  icon,
  label,
  description,
  horizontal = false,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  description?: string;
  horizontal?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all text-left",
        horizontal ? "flex items-center gap-3" : "flex flex-col items-center text-center",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-[#F8FAFC] hover:border-primary/50",
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-lg",
            horizontal ? "w-10 h-10 bg-primary/10" : "w-12 h-12 bg-primary/10 mb-2",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        >
          {icon}
        </div>
      )}
      <div>
        <span className={cn("font-medium", selected ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {selected && horizontal && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
    </button>
  );
}
