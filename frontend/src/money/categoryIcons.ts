import {
  Briefcase, Bus, CircleEllipsis, Clapperboard, Coins, GraduationCap, HandCoins, HeartPulse, House, Landmark, Laptop,
  ShoppingBag, ShoppingBasket, Store, Users, Utensils, Zap, type LucideIcon,
} from "lucide-react";
import type { Kind } from "./types";

const EXPENSE: Record<string, LucideIcon> = {
  rent: House, food: Utensils, groceries: ShoppingBasket, transport: Bus, education: GraduationCap, medical: HeartPulse,
  utilities: Zap, shopping: ShoppingBag, family: Users, entertainment: Clapperboard, emi: Landmark, other: CircleEllipsis,
};
const INCOME: Record<string, LucideIcon> = {
  salary: Briefcase, allowance: HandCoins, freelance: Laptop, business: Store, other: Coins,
};

/** A small picture for each category, so the entries list can be scanned at a glance. */
export function categoryIcon(kind: Kind, category: string): LucideIcon {
  return (kind === "income" ? INCOME : EXPENSE)[category] ?? (kind === "income" ? Coins : CircleEllipsis);
}
