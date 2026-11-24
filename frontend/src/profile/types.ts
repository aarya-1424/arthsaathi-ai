export type Occupation = "student" | "salaried" | "self_employed" | "homemaker" | "other";
export type KnowledgeLevel = "beginner" | "basic" | "intermediate" | "advanced";

export type FinancialProfile = {
  occupation: Occupation;
  age_range: string | null;
  state: string | null;
  monthly_income: number;
  income_source: string | null;
  monthly_expenses: number;
  monthly_savings: number | null;
  monthly_emi: number | null;
  dependents: number | null;
  emergency_fund: number | null;
  goals: string[];
  other_goal: string | null;
  knowledge_level: KnowledgeLevel;
};

export type Profile = {
  display_name: string | null;
  financial: FinancialProfile | null;
  onboarding_complete: boolean;
};

export type ProfileUpdate = FinancialProfile & { display_name: string | null };

type Option = { value: string; label: string };

export const OCCUPATIONS: Option[] = [
  { value: "student", label: "Student" },
  { value: "salaried", label: "Salaried employee" },
  { value: "self_employed", label: "Self-employed" },
  { value: "homemaker", label: "Homemaker" },
  { value: "other", label: "Other" },
];

export const AGE_RANGES: Option[] = [
  { value: "under_18", label: "Under 18" },
  { value: "18_24", label: "18–24" },
  { value: "25_34", label: "25–34" },
  { value: "35_44", label: "35–44" },
  { value: "45_54", label: "45–54" },
  { value: "55_plus", label: "55 or above" },
];

export const INCOME_SOURCES: Option[] = [
  { value: "salary", label: "Salary" },
  { value: "allowance", label: "Pocket money / allowance" },
  { value: "business", label: "Own business" },
  { value: "freelance", label: "Freelance / part-time" },
  { value: "pension", label: "Pension" },
  { value: "family", label: "Family support" },
  { value: "other", label: "Other" },
];

export const GOALS: Option[] = [
  { value: "save_money", label: "Save money" },
  { value: "emergency_fund", label: "Build an emergency fund" },
  { value: "manage_expenses", label: "Manage monthly expenses" },
  { value: "pay_off_debt", label: "Pay off a loan" },
  { value: "buy_gadget", label: "Buy a phone or laptop" },
  { value: "buy_vehicle", label: "Buy a vehicle" },
  { value: "education", label: "Save for education" },
  { value: "family_expense", label: "Plan a family expense" },
  { value: "learn_investing", label: "Learn about investing" },
  { value: "understand_taxes", label: "Understand taxes" },
  { value: "other", label: "Something else" },
];

export const KNOWLEDGE_LEVELS: (Option & { hint: string })[] = [
  { value: "beginner", label: "Beginner", hint: "I'm just starting to learn about money." },
  { value: "basic", label: "Basic", hint: "I know saving and budgeting basics." },
  { value: "intermediate", label: "Intermediate", hint: "I understand loans, insurance and SIPs." },
  { value: "advanced", label: "Advanced", hint: "I'm comfortable with taxes and investing." },
];

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const MAX_MONTHLY = 100_000_000;

/** ₹28,000 style formatting (Indian digit grouping). */
export function rupees(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}
