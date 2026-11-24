"""What a valid financial profile looks like. Anything else is rejected before reaching the database."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Occupation = Literal["student", "salaried", "self_employed", "homemaker", "other"]
AgeRange = Literal["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus"]
IncomeSource = Literal["salary", "allowance", "business", "freelance", "pension", "family", "other"]
KnowledgeLevel = Literal["beginner", "basic", "intermediate", "advanced"]
Goal = Literal[
    "save_money", "emergency_fund", "manage_expenses", "pay_off_debt", "buy_gadget",
    "buy_vehicle", "education", "family_expense", "learn_investing", "understand_taxes", "other",
]

INDIAN_STATES = (
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
)

# Whole rupees only. strict=True refuses text like "5000", decimals and true/false.
MAX_MONTHLY = 100_000_000  # ₹10 crore a month
Rupees = Annotated[int, Field(strict=True, ge=0, le=MAX_MONTHLY)]
BigRupees = Annotated[int, Field(strict=True, ge=0, le=10_000_000_000)]  # ₹1,000 crore


class FinancialProfile(BaseModel):
    """The financial details saved for one user."""

    model_config = ConfigDict(extra="forbid")

    occupation: Occupation
    age_range: AgeRange | None = None
    state: str | None = None
    monthly_income: Rupees
    income_source: IncomeSource | None = None
    monthly_expenses: Rupees
    monthly_savings: Rupees | None = None
    monthly_emi: Rupees | None = None
    dependents: Annotated[int, Field(strict=True, ge=0, le=20)] | None = None
    emergency_fund: BigRupees | None = None
    goals: list[Goal] = Field(default_factory=list, max_length=12)
    other_goal: Annotated[str, Field(max_length=100)] | None = None
    knowledge_level: KnowledgeLevel

    @field_validator("state")
    @classmethod
    def known_state(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if v not in INDIAN_STATES:
            raise ValueError("Please choose a state or union territory from the list.")
        return v

    @field_validator("goals")
    @classmethod
    def unique_goals(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))  # removes repeats, keeps order

    @model_validator(mode="after")
    def tidy_other_goal(self) -> "FinancialProfile":
        text = (self.other_goal or "").strip()
        # Only keep the free-text goal when "other" is ticked.
        self.other_goal = text if text and "other" in self.goals else None
        return self


class ProfileUpdate(FinancialProfile):
    """What the website sends when the user finishes onboarding or edits their profile."""

    display_name: Annotated[str, Field(max_length=80)] | None = None

    @field_validator("display_name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None


class ProfileOut(BaseModel):
    display_name: str | None
    financial: FinancialProfile | None
    onboarding_complete: bool
