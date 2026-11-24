import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Donut, Legend } from "./charts";

test("donut describes itself in words for screen readers", () => {
  render(<Donut label="Spending" segments={[{ label: "Rent", value: 8000 }, { label: "Food", value: 2000 }]} />);
  expect(screen.getByRole("img", { name: "Spending: Rent ₹8,000 (80%), Food ₹2,000 (20%)" })).toBeInTheDocument();
});

test("donut with no data says so and draws only the empty ring", () => {
  const { container } = render(<Donut label="Spending" segments={[{ label: "Rent", value: 0 }]} />);
  expect(screen.getByRole("img", { name: "Spending: no data yet" })).toBeInTheDocument();
  expect(container.querySelectorAll("circle")).toHaveLength(1);
});

test("donut skips zero and negative slices", () => {
  const { container } = render(<Donut label="X" segments={[{ label: "A", value: 5 }, { label: "B", value: 0 }, { label: "C", value: -3 }]} />);
  expect(container.querySelectorAll("circle")).toHaveLength(2); // background ring + one slice
});

test("legend shows real amounts and shares", () => {
  render(<Legend segments={[{ label: "Needs", value: 14000 }, { label: "Wants", value: 8400 }, { label: "Savings", value: 5600 }]} />);
  expect(screen.getByText("₹14,000")).toBeInTheDocument();
  expect(screen.getByText("50%")).toBeInTheDocument();
  expect(screen.getByText("20%")).toBeInTheDocument();
});
