import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  Shield,
  Home,
  TreePine,
  Mountain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/modals/LoginModal";
import { PaywallModal } from "@/components/modals/PaywallModal";

const STORAGE_KEY = "resilient_risk_quiz_draft";
const TOTAL_STEPS = 7;

// Country list (abbreviated for common ones)
const COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", 
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", 
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", 
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
  "United Kingdom", "United States", "Canada", "Australia", "New Zealand",
  "Switzerland", "Norway", "Iceland"
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

const defaultAnswers: QuizAnswers = {
  country: "",
  city: "",
  areaType: "",
  nearInfrastructure: "",
  householdSize: "",
  extraSupport: [],
  mobility: "",
};

export default function RiskCalculator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(defaultAnswers);
  const [showResults, setShowResults] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

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
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleExtraSupport = (value: string) => {
    setAnswers(prev => {
      if (value === "None") {
        return { ...prev, extraSupport: ["None"] };
      }
      const current = prev.extraSupport.filter(v => v !== "None");
      if (current.includes(value)) {
        return { ...prev, extraSupport: current.filter(v => v !== value) };
      }
      return { ...prev, extraSupport: [...current, value] };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return answers.country !== "";
      case 2: return true; // City is optional
      case 3: return answers.areaType !== "";
      case 4: return answers.nearInfrastructure !== "";
      case 5: return answers.householdSize !== "";
      case 6: return answers.extraSupport.length > 0;
      case 7: return answers.mobility !== "";
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  // Scoring logic
  const calculateScore = () => {
    let score = 30;

    // Area type
    switch (answers.areaType) {
      case "Urban": score += 10; break;
      case "Suburban": score += 5; break;
      case "Rural": score += 0; break;
      case "Remote": score += 5; break;
    }

    // Critical infrastructure
    switch (answers.nearInfrastructure) {
      case "Yes": score += 25; break;
      case "Not sure": score += 12; break;
      case "No": score += 0; break;
    }

    // Household size
    switch (answers.householdSize) {
      case "1": score += 0; break;
      case "2": score += 5; break;
      case "3–4": score += 10; break;
      case "5–6": score += 15; break;
      case "7+": score += 20; break;
    }

    // Extra support (additive)
    if (answers.extraSupport.includes("Kids")) score += 5;
    if (answers.extraSupport.includes("Elderly")) score += 5;
    if (answers.extraSupport.includes("Medical needs")) score += 10;
    if (answers.extraSupport.includes("Pets")) score += 3;

    // Mobility
    switch (answers.mobility) {
      case "Car available": score += 0; break;
      case "Public transport only": score += 8; break;
      case "Limited mobility": score += 12; break;
    }

    return Math.min(100, Math.max(0, score));
  };

  const getScoreLabel = (score: number) => {
    if (score < 40) return { label: "Low", color: "text-green-600", bg: "bg-green-500" };
    if (score < 70) return { label: "Medium", color: "text-amber-600", bg: "bg-amber-500" };
    return { label: "High", color: "text-red-600", bg: "bg-red-500" };
  };

  // Derived bar values
  const getExposureScore = () => {
    let score = 20;
    if (answers.areaType === "Urban") score += 30;
    if (answers.areaType === "Suburban") score += 15;
    if (answers.nearInfrastructure === "Yes") score += 40;
    if (answers.nearInfrastructure === "Not sure") score += 20;
    return Math.min(100, score);
  };

  const getHouseholdComplexity = () => {
    let score = 10;
    switch (answers.householdSize) {
      case "2": score += 10; break;
      case "3–4": score += 25; break;
      case "5–6": score += 40; break;
      case "7+": score += 50; break;
    }
    if (answers.extraSupport.includes("Kids")) score += 10;
    if (answers.extraSupport.includes("Elderly")) score += 10;
    if (answers.extraSupport.includes("Medical needs")) score += 15;
    if (answers.extraSupport.includes("Pets")) score += 5;
    return Math.min(100, score);
  };

  const getMobilityConstraints = () => {
    switch (answers.mobility) {
      case "Car available": return 20;
      case "Public transport only": return 55;
      case "Limited mobility": return 85;
      default: return 0;
    }
  };

  const filteredCountries = COUNTRIES.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const resetQuiz = () => {
    setAnswers(defaultAnswers);
    setStep(1);
    setShowResults(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (showResults) {
    const score = calculateScore();
    const scoreInfo = getScoreLabel(score);

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button onClick={handleBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-semibold text-foreground">Your Risk Assessment</h1>
          </div>

          {/* Score Card */}
          <Card className="p-6 mb-6 bg-[#F8FAFC] border-border/50">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-background border-4 border-primary/20 mb-4">
                <span className="text-3xl font-bold text-foreground">{score}</span>
              </div>
              <p className={cn("text-lg font-medium", scoreInfo.color)}>
                {scoreInfo.label} Risk Level
              </p>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Exposure</span>
                  <span className="text-foreground font-medium">{getExposureScore()}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/70 rounded-full transition-all" 
                    style={{ width: `${getExposureScore()}%` }} 
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Household complexity</span>
                  <span className="text-foreground font-medium">{getHouseholdComplexity()}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/70 rounded-full transition-all" 
                    style={{ width: `${getHouseholdComplexity()}%` }} 
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Mobility constraints</span>
                  <span className="text-foreground font-medium">{getMobilityConstraints()}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/70 rounded-full transition-all" 
                    style={{ width: `${getMobilityConstraints()}%` }} 
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Disclaimer */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            This is a planning aid — always follow local authorities' guidance.
          </p>

          {/* CTAs */}
          <div className="space-y-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate("/tools/supplies")}
            >
              Continue: 14-day essentials
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowLoginModal(true)}
            >
              Save this assessment
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => setShowPaywallModal(true)}
            >
              Generate Red Folder PDF (Premium)
            </Button>
          </div>

          {/* Reset link */}
          <div className="text-center mt-6">
            <button 
              onClick={resetQuiz}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Start over
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header with progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => step > 1 ? handleBack() : navigate("/be-prepared")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
            <div className="w-9" /> {/* Spacer for alignment */}
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
                {filteredCountries.map(country => (
                  <button
                    key={country}
                    onClick={() => updateAnswer("country", country)}
                    className={cn(
                      "p-3 text-left text-sm rounded-xl border transition-all",
                      answers.country === country
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background hover:border-primary/50 text-muted-foreground"
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
                onClick={() => { updateAnswer("city", ""); handleNext(); }}
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
                ].map(option => (
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
                {["No", "Not sure", "Yes"].map(option => (
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
                {["1", "2", "3–4", "5–6", "7+"].map(option => (
                  <button
                    key={option}
                    onClick={() => updateAnswer("householdSize", option)}
                    className={cn(
                      "w-16 h-16 rounded-xl border text-lg font-medium transition-all",
                      answers.householdSize === option
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background hover:border-primary/50 text-muted-foreground"
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
                {["None", "Kids", "Elderly", "Medical needs", "Pets"].map(option => (
                  <button
                    key={option}
                    onClick={() => toggleExtraSupport(option)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                      answers.extraSupport.includes(option)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50 text-muted-foreground"
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
                ].map(option => (
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
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1"
          >
            {step === TOTAL_STEPS ? "See Results" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StepContainer({ 
  icon, 
  title, 
  subtitle, 
  children 
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
        {icon}
      </div>
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
  horizontal = false
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
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-[#F8FAFC] hover:border-primary/50"
      )}
    >
      {icon && (
        <div className={cn(
          "flex items-center justify-center rounded-lg",
          horizontal ? "w-10 h-10 bg-primary/10" : "w-12 h-12 bg-primary/10 mb-2",
          selected ? "text-primary" : "text-muted-foreground"
        )}>
          {icon}
        </div>
      )}
      <div>
        <span className={cn(
          "font-medium",
          selected ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {selected && horizontal && (
        <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />
      )}
    </button>
  );
}
