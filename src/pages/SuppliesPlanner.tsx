import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
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
  AlertCircle,
  Dog,
  Cat,
  Baby,
  Pill,
  ShoppingBag,
  ExternalLink,
  Loader2
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Types
type HouseholdSize = "1" | "2" | "3-4" | "5-6" | "7+";
type DaysTarget = 7 | 14 | 21;
type PetType = "none" | "dog" | "cat" | "other";
type MedicalNeed = "none" | "prescriptions" | "devices";
type DietPref = "none" | "vegetarian" | "allergies";
type CookingLevel = "full" | "limited" | "none";
type WaterContext = "easy" | "limited" | "portable";
type PowerLevel = "none" | "basic" | "some" | "strong";
type CommLevel = "phone" | "powerbank" | "radio";
type CashLevel = "none" | "small" | "moderate" | "comfortable";
type DocsLevel = "none" | "some" | "organized";

interface WizardAnswers {
  householdSize: HouseholdSize | null;
  daysTarget: DaysTarget;
  pets: PetType[];
  hasKids: boolean;
  medicalNeeds: MedicalNeed;
  dietPref: DietPref;
  cookingLevel: CookingLevel;
  waterContext: WaterContext;
  powerLevel: PowerLevel;
  commLevel: CommLevel;
  cashLevel: CashLevel;
  docsLevel: DocsLevel;
}

interface SupplyItem {
  id: string;
  name: string;
  baseQuantity: number;
  unit: string;
  perPerson?: boolean;
  perDay?: boolean;
  hasRecommendation?: boolean;
}

interface SupplyCategory {
  id: string;
  name: string;
  icon: typeof Droplets;
  items: SupplyItem[];
  conditional?: "pets" | "baby";
}

interface CheckedState {
  [itemId: string]: boolean;
}

interface ProductRecommendation {
  title: string;
  reason: string;
  href: string;
}

// Storage keys
const DRAFT_KEY = "resilient_supplies_quiz_draft";
const STATE_KEY = "resilient_supplies_state";

// Product recommendations map
const productRecommendations: Record<string, ProductRecommendation[]> = {
  "water-container": [
    { title: "Collapsible water container", reason: "Easy to store when empty", href: "/products?q=water+container" },
  ],
  "water-purification": [
    { title: "Water purification tablets", reason: "Lightweight backup option", href: "/products?q=water+purification" },
  ],
  "power-bank": [
    { title: "High-capacity power bank", reason: "Keep devices charged for days", href: "/products?q=power+bank" },
  ],
  "flashlight": [
    { title: "LED headlamp", reason: "Hands-free lighting", href: "/products?q=headlamp" },
  ],
  "solar-charger": [
    { title: "Portable solar charger", reason: "Renewable power source", href: "/products?q=solar+charger" },
  ],
  "radio": [
    { title: "Emergency crank radio", reason: "No batteries needed", href: "/products?q=emergency+radio" },
  ],
  "first-aid-kit": [
    { title: "Comprehensive first aid kit", reason: "All essentials in one", href: "/products?q=first+aid+kit" },
  ],
  "multi-tool": [
    { title: "Quality multi-tool", reason: "Dozens of uses in one tool", href: "/products?q=multi+tool" },
  ],
  "batteries": [
    { title: "Battery variety pack", reason: "For all your devices", href: "/products?q=batteries" },
  ],
  "camping-stove": [
    { title: "Portable camping stove", reason: "Reliable cooking backup", href: "/products?q=camping+stove" },
  ],
};

// Hard-to-source items
const hardToSourceItems = [
  { id: "hts-water-container", name: "Water storage containers", hasRecommendation: true, recKey: "water-container" },
  { id: "hts-water-filter", name: "Water filter / purification", hasRecommendation: true, recKey: "water-purification" },
  { id: "hts-power-bank", name: "Power bank (high capacity)", hasRecommendation: true, recKey: "power-bank" },
  { id: "hts-headlamp", name: "Headlamp / lantern", hasRecommendation: true, recKey: "flashlight" },
  { id: "hts-batteries", name: "Battery charger + spare batteries", hasRecommendation: true, recKey: "batteries" },
  { id: "hts-radio", name: "Emergency radio", hasRecommendation: true, recKey: "radio" },
  { id: "hts-first-aid", name: "First aid kit + add-ons", hasRecommendation: true, recKey: "first-aid-kit" },
  { id: "hts-cash", name: "Cash envelope (organizer)", hasRecommendation: false },
  { id: "hts-doc-pouch", name: "Waterproof document pouch", hasRecommendation: false },
  { id: "hts-toolkit", name: "Basic tool kit", hasRecommendation: true, recKey: "multi-tool" },
  { id: "hts-pet-carrier", name: "Pet supplies container / carrier", hasRecommendation: false, conditional: "pets" },
];

// Supply categories data
const supplyCategories: SupplyCategory[] = [
  {
    id: "water",
    name: "Water & Hydration",
    icon: Droplets,
    items: [
      { id: "water-bottles", name: "Bottled water", baseQuantity: 3, unit: "liters", perPerson: true, perDay: true },
      { id: "water-purification", name: "Water purification tablets", baseQuantity: 1, unit: "pack", hasRecommendation: true },
      { id: "water-container", name: "Water storage container", baseQuantity: 1, unit: "container", hasRecommendation: true },
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
      { id: "camping-stove", name: "Camping stove or portable burner", baseQuantity: 1, unit: "unit", hasRecommendation: true },
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
      { id: "first-aid-kit", name: "First aid kit", baseQuantity: 1, unit: "kit", hasRecommendation: true },
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
      { id: "flashlight", name: "Flashlight/headlamp", baseQuantity: 1, unit: "unit", perPerson: true, hasRecommendation: true },
      { id: "batteries", name: "Extra batteries", baseQuantity: 8, unit: "batteries", hasRecommendation: true },
      { id: "power-bank", name: "Power bank (charged)", baseQuantity: 1, unit: "unit", hasRecommendation: true },
      { id: "candles", name: "Candles", baseQuantity: 6, unit: "candles" },
      { id: "solar-charger", name: "Solar charger (optional)", baseQuantity: 1, unit: "unit", hasRecommendation: true },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    icon: Radio,
    items: [
      { id: "radio", name: "Battery/crank radio", baseQuantity: 1, unit: "unit", hasRecommendation: true },
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
      { id: "multi-tool", name: "Multi-tool/Swiss army knife", baseQuantity: 1, unit: "unit", hasRecommendation: true },
      { id: "duct-tape", name: "Duct tape", baseQuantity: 1, unit: "roll" },
      { id: "rope", name: "Rope/paracord (10m)", baseQuantity: 1, unit: "length" },
      { id: "work-gloves", name: "Work gloves", baseQuantity: 1, unit: "pair" },
      { id: "plastic-sheeting", name: "Plastic sheeting", baseQuantity: 1, unit: "sheet" },
    ],
  },
  {
    id: "pets",
    name: "Pet Supplies",
    icon: Dog,
    conditional: "pets",
    items: [
      { id: "pet-food", name: "Pet food", baseQuantity: 0.5, unit: "kg", perDay: true },
      { id: "pet-water-bowl", name: "Collapsible water bowl", baseQuantity: 1, unit: "unit" },
      { id: "pet-carrier", name: "Pet carrier/crate", baseQuantity: 1, unit: "unit" },
      { id: "pet-meds", name: "Pet medications", baseQuantity: 14, unit: "days" },
      { id: "pet-leash", name: "Leash & collar with ID", baseQuantity: 1, unit: "set" },
    ],
  },
  {
    id: "baby",
    name: "Baby Items",
    icon: Baby,
    conditional: "baby",
    items: [
      { id: "diapers", name: "Diapers", baseQuantity: 8, unit: "diapers", perDay: true },
      { id: "baby-wipes", name: "Baby wipes", baseQuantity: 1, unit: "pack" },
      { id: "formula", name: "Formula/baby food", baseQuantity: 1, unit: "container", perDay: true },
      { id: "bottles", name: "Bottles", baseQuantity: 3, unit: "bottles" },
      { id: "baby-clothes", name: "Extra baby clothes", baseQuantity: 3, unit: "sets" },
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

const defaultAnswers: WizardAnswers = {
  householdSize: null,
  daysTarget: 14,
  pets: [],
  hasKids: false,
  medicalNeeds: "none",
  dietPref: "none",
  cookingLevel: "full",
  waterContext: "easy",
  powerLevel: "none",
  commLevel: "phone",
  cashLevel: "none",
  docsLevel: "none",
};

const SuppliesPlanner = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const totalWizardSteps = 12;

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<WizardAnswers>(defaultAnswers);

  // Checklist state
  const [checkedItems, setCheckedItems] = useState<CheckedState>({});
  const [checkedHardToSource, setCheckedHardToSource] = useState<CheckedState>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["water"]);

  // Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.answers) setAnswers({ ...defaultAnswers, ...draft.answers });
        if (typeof draft.currentStep === "number") setCurrentStep(draft.currentStep);
        if (draft.showResults) setShowResults(true);
      } catch {}
    }
    
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.checkedItems) setCheckedItems(state.checkedItems);
        if (state.checkedHardToSource) setCheckedHardToSource(state.checkedHardToSource);
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

  // Get filtered categories based on answers
  const filteredCategories = useMemo(() => {
    return supplyCategories.filter((cat) => {
      if (cat.conditional === "pets") {
        return answers.pets.length > 0 && !answers.pets.includes("none");
      }
      if (cat.conditional === "baby") {
        return answers.hasKids;
      }
      return true;
    });
  }, [answers.pets, answers.hasKids]);

  // Get filtered hard-to-source items
  const filteredHardToSource = useMemo(() => {
    return hardToSourceItems.filter((item) => {
      if (item.conditional === "pets") {
        return answers.pets.length > 0 && !answers.pets.includes("none");
      }
      return true;
    });
  }, [answers.pets]);

  // Save checked state
  useEffect(() => {
    if (showResults) {
      const totalItems = filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);
      const checkedCount = Object.values(checkedItems).filter(Boolean).length;
      const preparedness = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
      
      localStorage.setItem(STATE_KEY, JSON.stringify({
        checkedItems,
        checkedHardToSource,
        preparedness,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [checkedItems, checkedHardToSource, showResults, filteredCategories]);

  // Compute preparedness stats
  const stats = useMemo(() => {
    const categoryStats = filteredCategories.map((cat) => {
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

    const totalItems = filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);
    const totalChecked = Object.values(checkedItems).filter(Boolean).length;
    const overallPreparedness = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

    const topGaps = [...categoryStats]
      .sort((a, b) => a.completion - b.completion)
      .slice(0, 3);

    return { categoryStats, overallPreparedness, topGaps };
  }, [checkedItems, filteredCategories]);

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

  const toggleHardToSource = (itemId: string) => {
    setCheckedHardToSource((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSavePlan = async () => {
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    setIsSaving(true);
    try {
      // First check if a plan already exists
      const { data: existing } = await supabase
        .from("supplies_plans")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const planData = {
        user_id: user.id,
        days: answers.daysTarget,
        household_size_bucket: answers.householdSize,
        inputs: JSON.parse(JSON.stringify(answers)) as Json,
        plan: JSON.parse(JSON.stringify({ checkedItems, checkedHardToSource })) as Json,
        preparedness_pct: stats.overallPreparedness,
      };

      const { error } = existing
        ? await supabase.from("supplies_plans").update(planData).eq("user_id", user.id)
        : await supabase.from("supplies_plans").insert(planData);

      if (error) throw error;

      toast({
        title: "Plan saved!",
        description: "Your supplies plan has been saved to your account.",
      });
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Save failed",
        description: "Could not save your plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePet = (pet: PetType) => {
    setAnswers((prev) => {
      if (pet === "none") {
        return { ...prev, pets: prev.pets.includes("none") ? [] : ["none"] };
      }
      const withoutNone = prev.pets.filter((p) => p !== "none");
      if (withoutNone.includes(pet)) {
        return { ...prev, pets: withoutNone.filter((p) => p !== pet) };
      }
      return { ...prev, pets: [...withoutNone, pet] };
    });
  };

  const canProceed = () => {
    if (currentStep === 0) return answers.householdSize !== null;
    return true;
  };

  // Chip button component
  const ChipButton = ({ 
    selected, 
    onClick, 
    children, 
    className = "" 
  }: { 
    selected: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:border-primary/50 text-foreground",
        className
      )}
    >
      {children}
    </button>
  );

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
                <ChipButton
                  key={size}
                  selected={answers.householdSize === size}
                  onClick={() => setAnswers({ ...answers, householdSize: size })}
                  className="px-2"
                >
                  {size}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              How many days to plan for?
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
              Any pets?
            </h2>
            <p className="text-sm text-muted-foreground text-center">Select all that apply</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "none" as PetType, label: "None", icon: null },
                { value: "dog" as PetType, label: "Dog", icon: Dog },
                { value: "cat" as PetType, label: "Cat", icon: Cat },
                { value: "other" as PetType, label: "Other", icon: null },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.pets.includes(option.value)}
                  onClick={() => togglePet(option.value)}
                  className="flex items-center gap-2"
                >
                  {option.icon && <option.icon className="h-4 w-4" />}
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Kids or baby items needed?
            </h2>
            <div className="flex justify-center gap-3">
              <ChipButton
                selected={!answers.hasKids}
                onClick={() => setAnswers({ ...answers, hasKids: false })}
                className="flex items-center gap-2 px-6"
              >
                No
              </ChipButton>
              <ChipButton
                selected={answers.hasKids}
                onClick={() => setAnswers({ ...answers, hasKids: true })}
                className="flex items-center gap-2 px-6"
              >
                <Baby className="h-4 w-4" />
                Yes
              </ChipButton>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Medical needs?
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "none" as MedicalNeed, label: "None" },
                { value: "prescriptions" as MedicalNeed, label: "Regular prescriptions" },
                { value: "devices" as MedicalNeed, label: "Medical devices" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.medicalNeeds === option.value}
                  onClick={() => setAnswers({ ...answers, medicalNeeds: option.value })}
                  className="flex items-center gap-2"
                >
                  {option.value !== "none" && <Pill className="h-4 w-4" />}
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Diet preference?
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "none" as DietPref, label: "No restrictions" },
                { value: "vegetarian" as DietPref, label: "Vegetarian" },
                { value: "allergies" as DietPref, label: "Allergies" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.dietPref === option.value}
                  onClick={() => setAnswers({ ...answers, dietPref: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Cooking availability?
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "full" as CookingLevel, label: "Full kitchen" },
                { value: "limited" as CookingLevel, label: "Limited (microwave)" },
                { value: "none" as CookingLevel, label: "No cooking" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.cookingLevel === option.value}
                  onClick={() => setAnswers({ ...answers, cookingLevel: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Water storage context?
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "easy" as WaterContext, label: "Easy access" },
                { value: "limited" as WaterContext, label: "Limited storage" },
                { value: "portable" as WaterContext, label: "Need portable options" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.waterContext === option.value}
                  onClick={() => setAnswers({ ...answers, waterContext: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Power backup level today?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "none" as PowerLevel, label: "None" },
                { value: "basic" as PowerLevel, label: "Basic (flashlights)" },
                { value: "some" as PowerLevel, label: "Some (power bank)" },
                { value: "strong" as PowerLevel, label: "Strong (generator)" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.powerLevel === option.value}
                  onClick={() => setAnswers({ ...answers, powerLevel: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Communication setup?
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "phone" as CommLevel, label: "Phone only" },
                { value: "powerbank" as CommLevel, label: "Phone + power bank" },
                { value: "radio" as CommLevel, label: "Radio available" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.commLevel === option.value}
                  onClick={() => setAnswers({ ...answers, commLevel: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Cash on hand?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "none" as CashLevel, label: "None" },
                { value: "small" as CashLevel, label: "Small (€)" },
                { value: "moderate" as CashLevel, label: "Moderate (€€)" },
                { value: "comfortable" as CashLevel, label: "Comfortable (€€€)" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.cashLevel === option.value}
                  onClick={() => setAnswers({ ...answers, cashLevel: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              Documents readiness?
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { value: "none" as DocsLevel, label: "Not organized" },
                { value: "some" as DocsLevel, label: "Some ready" },
                { value: "organized" as DocsLevel, label: "Organized" },
              ].map((option) => (
                <ChipButton
                  key={option.value}
                  selected={answers.docsLevel === option.value}
                  onClick={() => setAnswers({ ...answers, docsLevel: option.value })}
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Product recommendation link
  const ProductLink = ({ itemId }: { itemId: string }) => {
    const recs = productRecommendations[itemId];
    if (!recs || recs.length === 0) return null;
    
    return (
      <button
        onClick={() => navigate(recs[0].href)}
        className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
      >
        <ShoppingBag className="h-3 w-3" />
        <span>Products</span>
      </button>
    );
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
                {currentStep === totalWizardSteps - 1 ? "Generate Plan" : "Next"}
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
              Your {answers.daysTarget}-Day Supplies Plan
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
                Get my Personalized Resiliency Plan (€49)
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Printable offline PDF + Vault + Plans A & B. No subscription.
              </p>
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={handleSavePlan}
                  disabled={isSaving}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  {isAuthenticated ? "Save progress" : "Log in to save (free)"}
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

          {/* Hard to Source Section */}
          <Card className="p-4 mb-4 border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Harder to get last-minute</h3>
                <p className="text-xs text-muted-foreground">
                  These items are easier to arrange ahead of time. Consider prioritizing them.
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {filteredHardToSource.map((item) => {
                const isChecked = checkedHardToSource[item.id] || false;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-3 p-2 rounded-lg transition-colors",
                      isChecked ? "bg-primary/5" : "hover:bg-amber-100/50"
                    )}
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleHardToSource(item.id)}
                      />
                      <span className={cn(
                        "text-sm",
                        isChecked ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {item.name}
                      </span>
                    </label>
                    {item.hasRecommendation && item.recKey && (
                      <button
                        onClick={() => navigate(`/be-prepared#products?q=${encodeURIComponent(item.name)}`)}
                        className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Products</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Categories Accordion */}
          <div className="space-y-2">
            {filteredCategories.map((category) => {
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
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 p-3 transition-colors",
                              isChecked && "bg-primary/5"
                            )}
                          >
                            <label className="flex items-center gap-3 flex-1 cursor-pointer">
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
                            </label>
                            <div className="flex items-center gap-2">
                              {item.hasRecommendation && <ProductLink itemId={item.id} />}
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {quantity} {item.unit}
                              </div>
                            </div>
                          </div>
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
                Get your Personalized Resiliency Plan
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Printable offline 'Red Folder' PDF + encrypted Vault + Plans A & B.
              </p>
              <ul className="text-xs text-muted-foreground mb-4 space-y-1">
                <li>✓ Printable offline PDF (Red Folder format)</li>
                <li>✓ Encrypted Vault (IDs, contacts, medical)</li>
                <li>✓ Plans A & B (exit + emergency)</li>
                <li>✓ Encrypted backup & restore</li>
                <li>✓ Premium insights & next steps</li>
              </ul>
              <Button onClick={() => setShowPaywallModal(true)} className="gap-2">
                <Download className="h-4 w-4" />
                Generate my Plan (€49)
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
