import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Remove rendered screens between tests so they don't pile up.
afterEach(() => cleanup());
