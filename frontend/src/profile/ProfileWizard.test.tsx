import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("../lib/supabase", () => ({
  authConfigured: true,
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));

import { ProfileWizard } from "./ProfileWizard";
import type { Profile } from "./types";

const SAVED: Profile = {
  display_name: "Rahul",
  onboarding_complete: true,
  financial: {
    occupation: "salaried", age_range: null, state: null, monthly_income: 28000, income_source: null,
    monthly_expenses: 20000, monthly_savings: null, monthly_emi: null, dependents: null,
    emergency_fund: null, goals: ["emergency_fund"], other_goal: null, knowledge_level: "beginner",
  },
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => SAVED });
  vi.stubGlobal("fetch", fetchMock);
});

const INCOME = "Monthly income (or pocket money)";
const EXPENSES = "Monthly expenses (approximate)";

/** Pick a ready-made amount from a money dropdown. */
async function pick(user: ReturnType<typeof userEvent.setup>, label: string, amount: string) {
  await user.selectOptions(screen.getByLabelText(label), amount);
}

/** Choose "Other amount" and type our own number. */
async function typeOwn(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  await user.selectOptions(screen.getByLabelText(label), "other");
  await user.type(screen.getByLabelText(`${label}: exact amount`), text);
}

async function fillAll(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("What should we call you?"), "Rahul");
  await user.click(screen.getByLabelText("Salaried employee"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await typeOwn(user, INCOME, "28,000");
  await pick(user, EXPENSES, "20000");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByLabelText("Build an emergency fund"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByLabelText(/^Beginner/));
}

test("full onboarding sends clean numbers to the server with the login token", async () => {
  const onSaved = vi.fn();
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={onSaved} />);
  await fillAll(user);
  await user.click(screen.getByRole("button", { name: "Finish" }));

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(SAVED));
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/profile");
  expect(init.method).toBe("PUT");
  expect(init.headers.Authorization).toBe("Bearer tok");
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({
    display_name: "Rahul", occupation: "salaried", monthly_income: 28000, monthly_expenses: 20000,
    monthly_savings: null, goals: ["emergency_fund"], knowledge_level: "beginner", state: null,
  });
});

test("cannot move on without choosing an occupation", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("alert")).toHaveTextContent("tell us what you do");
  expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
});

test("income is required but optional money fields can be skipped", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Student"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("alert")).toHaveTextContent("monthly income");
  await pick(user, INCOME, "0");
  await typeOwn(user, EXPENSES, "1500");
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument();
});

test("money boxes ignore minus signs, letters and decimals", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Student"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await typeOwn(user, INCOME, "-5a00.75");
  expect(screen.getByLabelText(`${INCOME}: exact amount`)).toHaveValue("50,075"); // digits only, shown with commas
});

test("shows the safety promise about PINs and OTPs", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Student"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText(/never ask for your bank password, UPI PIN, OTP or card PIN/)).toBeInTheDocument();
});

test("gently warns when spending is more than income, but still allows it", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Student"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await pick(user, INCOME, "5000");
  await typeOwn(user, EXPENSES, "7000");
  expect(screen.getByText(/add up to more than your income/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument();
});

test("edit mode starts with saved answers and says Save changes", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={SAVED} mode="edit" onSaved={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByLabelText("What should we call you?")).toHaveValue("Rahul");
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
});

test("a server error is shown and the user can try again", async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ detail: "We could not reach the database. Please try again in a moment." }) });
  const onSaved = vi.fn();
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={onSaved} />);
  await fillAll(user);
  await user.click(screen.getByRole("button", { name: "Finish" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not reach the database");
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Finish" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

test("students see pocket-money sized amounts, earners see salary sized amounts", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Student"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(within(screen.getByLabelText(INCOME)).getByRole("option", { name: "₹2,000" })).toBeInTheDocument();
  expect(within(screen.getByLabelText(INCOME)).queryByRole("option", { name: "₹1,50,000" })).not.toBeInTheDocument();
  unmount();

  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Salaried employee"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  const income = screen.getByLabelText(INCOME);
  expect(within(income).getByRole("option", { name: "₹25,000" })).toBeInTheDocument();
  expect(within(income).queryByRole("option", { name: "₹2,000" })).not.toBeInTheDocument();
  expect(within(income).getByRole("option", { name: "None (₹0)" })).toBeInTheDocument();
});

test("the typing box only appears after choosing Other amount", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={null} mode="onboarding" onSaved={vi.fn()} />);
  await user.click(screen.getByLabelText("Salaried employee"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.queryByLabelText(`${INCOME}: exact amount`)).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText(INCOME), "other");
  expect(screen.getByLabelText(`${INCOME}: exact amount`)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText(INCOME), "30000");
  expect(screen.queryByLabelText(`${INCOME}: exact amount`)).not.toBeInTheDocument();
});

test("editing a saved amount that isn't in the list opens the typing box with it", async () => {
  const user = userEvent.setup();
  render(<ProfileWizard initial={{ ...SAVED, financial: { ...SAVED.financial!, monthly_income: 28750 } }} mode="edit" onSaved={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText(`${INCOME}: exact amount`)).toHaveValue("28,750");
  expect(screen.getByLabelText(EXPENSES)).toHaveValue("20000");  // 20000 is in the list, so just selected
});
