import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Droplets, 
  UtensilsCrossed, 
  Flame, 
  Heart, 
  Sparkles, 
  Zap, 
  Radio, 
  FileText, 
  Shirt, 
  Wrench,
  ChevronDown,
  ChevronUp,
  Lock,
  Download,
  Save,
  BookOpen,
  AlertCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { LoginModal } from "@/components/modals/LoginModal";
import { PaywallModal } from "@/components/modals/PaywallModal";
import { cn } from "@/lib/utils";

// Types
type HouseholdSize = "1" | "2" | "3-4" | "5-6" | "7+";
type DaysTarget = 7 | 14 | 21;
type SpecialNeeds = "none" | "baby" | "medical" | "pets";

interface WizardAnswers {
  householdSize: HouseholdSize | null;
  daysTarget: DaysTarget;
  specialNeeds: SpecialNeeds[];
}

interface SupplyItem {
  id: string;
  name: string;
  baseQuantity: number;
  unit: string;
  perPerson?: boolean;
  perDay?: boolean;
}

interface SupplyCategory {
  id: string;
  name: string;
  icon: typeof Droplets;
  items: SupplyItem[];
}

interface CheckedState {
  [itemId: string]: boolean;
}

// Storage keys
const DRAFT_KEY = "resilient_supplies_draft";
const STATE_KEY = "resilient_supplies_state";

// Supply categories data
const supplyCategories: SupplyCategory[] = [
  {
    id: "water",
    name: "Water & Hydration",
    icon: Droplets,
    items: [
      { id: "water-bottles", name: "Bottled water", baseQuantity: 3, unit: "liters", perPerson: true, perDay: true },
      { id: "water-purification", name: "Water purification tablets", baseQuantity: 1, unit: "pack" },
      { id: "water-container", name: "Water storage container", baseQuantity: 1, unit: "container" },
    ],
  },
  {
    id: "food",
    name: "Food (Shelf-Stable)",
    icon: UtensilsCrossed,
    items: [
      { id: "canned-food", name: "Canned food (meals)", baseQuantity: 2, unit: "cans", perPerson: true, perDay: true },
      { id: "dried-goods", name: "Dried pasta/rice", baseQuantity: 0.5, unit: "kg", perPerson: true },
      { id: "crackers", name: "Crackers/hardtack", baseQuantity: 1, unit: "pack", perPerson: true },
      { id: "nuts", name: "Nuts & dried fruit", baseQuantity: 0.3, unit: "kg", perPerson: true },
      { id: "peanut-butter", name: "Peanut butter", baseQuantity: 1, unit: "jar" },
      { id: "honey", name: "Honey/jam", baseQuantity: 1, unit: "jar" },
    ],
  },
  {
    id: "cooking",
    name: "Cooking & Utilities",
    icon: Flame,
    items: [
      { id: "camping-stove", name: "Camping stove or portable burner", baseQuantity: 1, unit: "unit" },
      { id: "fuel", name: "Fuel canisters", baseQuantity: 2, unit: "canisters" },
      { id: "matches", name: "Matches/lighter (waterproof)", baseQuantity: 2, unit: "packs" },
      { id: "can-opener", name: "Manual can opener", baseQuantity: 1, unit: "unit" },
      { id: "utensils", name: "Reusable utensils & plates", baseQuantity: 1, unit: "set", perPerson: true },
    ],
  },
  {
    id: "hygiene",
    name: "Hygiene & Sanitation",
    icon: Sparkles,
    items: [
      { id: "toilet-paper", name: "Toilet paper", baseQuantity: 1, unit: "roll", perPerson: true },
      { id: "wet-wipes", name: "Wet wipes", baseQuantity: 1, unit: "pack", perPerson: true },
      { id: "hand-sanitizer", name: "Hand sanitizer", baseQuantity: 1, unit: "bottle" },
      { id: "soap", name: "Soap bars", baseQuantity: 2, unit: "bars" },
      { id: "trash-bags", name: "Heavy-duty trash bags", baseQuantity: 10, unit: "bags" },
      { id: "feminine", name: "Feminine hygiene products", baseQuantity: 1, unit: "pack" },
    ],
  },
  {
    id: "medical",
    name: "First Aid & Medical Basics",
    icon: Heart,
    items: [
      { id: "first-aid-kit", name: "First aid kit", baseQuantity: 1, unit: "kit" },
      { id: "pain-relievers", name: "Pain relievers (ibuprofen/paracetamol)", baseQuantity: 1, unit: "box" },
      { id: "bandages", name: "Bandages & gauze", baseQuantity: 1, unit: "pack" },
      { id: "antiseptic", name: "Antiseptic wipes/spray", baseQuantity: 1, unit: "bottle" },
      { id: "prescription", name: "Prescription medications (extra supply)", baseQuantity: 14, unit: "days" },
      { id: "thermometer", name: "Thermometer", baseQuantity: 1, unit: "unit" },
    ],
  },
  {
    id: "power",
    name: "Power & Lighting",
    icon: Zap,
    items: [
      { id: "flashlight", name: "Flashlight/headlamp", baseQuantity: 1, unit: "unit", perPerson: true },
      { id: "batteries", name: "Extra batteries", baseQuantity: 8, unit: "batteries" },
      { id: "power-bank", name: "Power bank (charged)", baseQuantity: 1, unit: "unit" },
      { id: "candles", name: "Candles", baseQuantity: 6, unit: "candles" },
      { id: "solar-charger", name: "Solar charger (optional)", baseQuantity: 1, unit: "unit" },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    icon: Radio,
    items: [
      { id: "radio", name: "Battery/crank radio", baseQuantity: 1, unit: "unit" },
      { id: "whistle", name: "Emergency whistle", baseQuantity: 1, unit: "unit", perPerson: true },
      { id: "contacts-list", name: "Printed emergency contacts", baseQuantity: 1, unit: "list" },
      { id: "phone-charger", name: "Phone charger cable", baseQuantity: 1, unit: "cable" },
    ],
  },
  {
    id: "documents",
    name: "Documents & Cash",
    icon: FileText,
    items: [
      { id: "id-copies", name: "Copies of IDs & passports", baseQuantity: 1, unit: "set" },
      { id: "cash", name: "Cash (small bills)", baseQuantity: 100, unit: "€" },
      { id: "insurance", name: "Insurance documents copies", baseQuantity: 1, unit: "set" },
      { id: "medical-records", name: "Medical records summary", baseQuantity: 1, unit: "copy" },
    ],
  },
  {
    id: "clothing",
    name: "Clothing & Warmth",
    icon: Shirt,
    items: [
      { id: "warm-layers", name: "Warm layers/fleece", baseQuantity: 1, unit: "set", perPerson: true },
      { id: "rain-gear", name: "Rain jacket/poncho", baseQuantity: 1, unit: "unit", perPerson: true },
      { id: "sturdy-shoes", name: "Sturdy shoes", baseQuantity: 1, unit: "pair", perPerson: true },
      { id: "blankets", name: "Emergency blankets", baseQuantity: 1, unit: "blanket", perPerson: true },
      { id: "sleeping-bag", name: "Sleeping bag (if space)", baseQuantity: 1, unit: "bag" },
    ],
  },
  {
    id: "tools",
    name: "Tools & Repair",
    icon: Wrench,
    items: [
      { id: "multi-tool", name: "Multi-tool/Swiss army knife", baseQuantity: 1, unit: "unit" },
      { id: "duct-tape", name: "Duct tape", baseQuantity: 1, unit: "roll" },
      { id: "rope", name: "Rope/paracord (10m)", baseQuantity: 1, unit: "length" },
      { id: "work-gloves", name: "Work gloves", baseQuantity: 1, unit: "pair" },
      { id: "plastic-sheeting", name: "Plastic sheeting", baseQuantity: 1, unit: "sheet" },
    ],
  },
];

// Helper: get person multiplier from household size
const getPersonMultiplier = (size: HouseholdSize | null): number => {
  if (!size) return 2;
  const map: Record<HouseholdSize, number> = {
    "1": 1,
    "2": 2,
    "3-4": 3.5,
    "5-6": 5.5,
    "7+": 8,
  };
  return map[size];
};

// Helper: calculate quantity for an item
const calculateQuantity = (
  item: SupplyItem,
  householdSize: HouseholdSize | null,
  daysTarget: DaysTarget
): number => {
  let quantity = item.baseQuantity;
  const persons = getPersonMultiplier(householdSize);
  
  if (item.perPerson) {
    quantity *= persons;
  }
  if (item.perDay) {
    quantity *= daysTarget;
  }
  
  return Math.ceil(quantity);
};

const SuppliesPlanner = () => {
  const navigate = useNavigate();
  const totalWizardSteps = 3;

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0); // 0 = wizard step 1, etc.
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<WizardAnswers>({
    householdSize: null,
    daysTarget: 14,
    specialNeeds: [],
  });

  // Checklist state
  const [checkedItems, setCheckedItems] = useState<CheckedState>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["water"]);

  // Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.answers) setAnswers(draft.answers);
        if (typeof draft.currentStep === "number") setCurrentStep(draft.currentStep);
        if (draft.showResults) setShowResults(true);
      } catch {}
    }
    
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.checkedItems) setCheckedItems(state.checkedItems);
      } catch {}
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      answers,
      currentStep,
      showResults,
    }));
  }, [answers, currentStep, showResults]);

  // Save checked state
  useEffect(() => {
    if (showResults) {
      const totalItems = supplyCategories.reduce((acc, cat) => acc + cat.items.length, 0);
      const checkedCount = Object.values(checkedItems).filter(Boolean).length;
      const preparedness = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
      
      localStorage.setItem(STATE_KEY, JSON.stringify({
        checkedItems,
        preparedness,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [checkedItems, showResults]);

  // Compute preparedness stats
  const stats = useMemo(() => {
    const categoryStats = supplyCategories.map((cat) => {
      const total = cat.items.length;
      const checked = cat.items.filter((item) => checkedItems[item.id]).length;
      return {
        id: cat.id,
        name: cat.name,
        completion: total > 0 ? Math.round((checked / total) * 100) : 0,
        checked,
        total,
      };
    });

    const totalItems = supplyCategories.reduce((acc, cat) => acc + cat.items.length, 0);
    const totalChecked = Object.values(checkedItems).filter(Boolean).length;
    const overallPreparedness = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

    const topGaps = [...categoryStats]
      .sort((a, b) => a.completion - b.completion)
      .slice(0, 3);

    return { categoryStats, overallPreparedness, topGaps };
  }, [checkedItems]);

  const handleNext = () => {
    if (currentStep < totalWizardSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const toggleSpecialNeed = (need: SpecialNeeds) => {
    setAnswers((prev) => {
      const current = prev.specialNeeds;
      if (need === "none") {
        return { ...prev, specialNeeds: current.includes("none") ? [] : ["none"] };
      }
      const withoutNone = current.filter((n) => n !== "none");
      if (withoutNone.includes(need)) {
        return { ...prev, specialNeeds: withoutNone.filter((n) => n !== need) };
      }
      return { ...prev, specialNeeds: [...withoutNone, need] };
    });
  };

  const canProceed = () => {
    if (currentStep === 0) return answers.householdSize !== null;
    return true;
  };

  // Wizard steps
  const renderWizardStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              How many people in your household?
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {(["1", "2", "3-4", "5-6", "7+"] as HouseholdSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setAnswers({ ...answers, householdSize: size })}
                  className={cn(
                    "py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all",
                    answers.householdSize === size
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/50 text-foreground"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              How many days to prepare for?
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {([7, 14, 21] as DaysTarget[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setAnswers({ ...answers, daysTarget: days })}
                  className={cn(
                    "py-4 px-3 rounded-xl border-2 transition-all",
                    answers.daysTarget === days
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className="text-2xl font-bold text-foreground">{days}</div>
                  <div className="text-xs text-muted-foreground">days</div>
                  {days === 14 && (
                    <div className="text-[10px] text-primary mt-1 font-medium">Recommended</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Any special needs?
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Select all that apply
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "none" as SpecialNeeds, label: "None" },
                { value: "baby" as SpecialNeeds, label: "Baby items" },
                { value: "medical" as SpecialNeeds, label: "Medical needs" },
                { value: "pets" as SpecialNeeds, label: "Pets" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleSpecialNeed(option.value)}
                  className={cn(
                    "py-2 px-4 rounded-full border-2 text-sm font-medium transition-all",
                    answers.specialNeeds.includes(option.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/50 text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Wizard screen
  if (!showResults) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-10">
          <div className="container mx-auto px-4 max-w-md">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Step {currentStep + 1} of {totalWizardSteps}</span>
                <span>{Math.round(((currentStep + 1) / totalWizardSteps) * 100)}%</span>
              </div>
              <Progress value={((currentStep + 1) / totalWizardSteps) * 100} className="h-1.5" />
            </div>

            {/* Step content */}
            <Card className="p-6 mb-6">
              {renderWizardStep()}
            </Card>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1"
              >
                {currentStep === totalWizardSteps - 1 ? "Generate List" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Results screen
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-10">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-1">
              Your {answers.daysTarget}-Day Supplies List
            </h1>
            <p className="text-sm text-muted-foreground">
              For {answers.householdSize} {parseInt(answers.householdSize || "1") === 1 ? "person" : "people"} • Check items as you gather them
            </p>
          </div>

          {/* Sticky CTA Bar */}
          <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 -mx-4 px-4 py-3 mb-4">
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setShowPaywallModal(true)}
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Export my Printable Plan (Premium)
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <Save className="h-3 w-3" />
                  Save & continue later (free)
                </button>
                <button
                  onClick={() => navigate("/library")}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  Official guidance
                </button>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <Card className="p-4 mb-4 bg-[#F8FAFC] border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.overallPreparedness}%</div>
                <div className="text-xs text-muted-foreground">Preparedness</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Top gaps:</div>
                <div className="flex flex-wrap justify-end gap-1">
                  {stats.topGaps.slice(0, 3).map((gap) => (
                    <span
                      key={gap.id}
                      className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded"
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      {gap.name.split(" ")[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Progress value={stats.overallPreparedness} className="h-2" />
          </Card>

          {/* Premium Microcopy */}
          <div className="text-center mb-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Printable offline plan (PDF) • 49€ one-time
            </span>
          </div>

          {/* Categories Accordion */}
          <div className="space-y-2">
            {supplyCategories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategories.includes(category.id);
              const catStats = stats.categoryStats.find((s) => s.id === category.id);

              return (
                <Card key={category.id} className="overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-foreground">
                          {category.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {catStats?.checked}/{catStats?.total} items
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-medium text-foreground">
                          {catStats?.completion}%
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Items List */}
                  {isExpanded && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {category.items.map((item) => {
                        const quantity = calculateQuantity(
                          item,
                          answers.householdSize,
                          answers.daysTarget
                        );
                        const isChecked = checkedItems[item.id] || false;

                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors",
                              isChecked && "bg-primary/5"
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-sm",
                                isChecked ? "text-muted-foreground line-through" : "text-foreground"
                              )}>
                                {item.name}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {quantity} {item.unit}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <Card className="mt-6 p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="text-center">
              <div className="inline-flex items-center gap-1 text-xs text-primary bg-primary/20 px-2 py-0.5 rounded-full font-medium mb-2">
                <Lock className="h-3 w-3" />
                Premium
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Export your Printable Plan
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get a printable offline PDF in Red Folder format, plus encrypted Vault access.
              </p>
              <Button onClick={() => setShowPaywallModal(true)} className="gap-2">
                <Download className="h-4 w-4" />
                Export Plan (€49)
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2">
                One-time purchase. No subscription.
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Modals */}
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      <PaywallModal open={showPaywallModal} onOpenChange={setShowPaywallModal} />
    </div>
  );
};

export default SuppliesPlanner;
