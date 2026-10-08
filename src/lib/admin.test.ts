import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdminEmail } from "./admin-auth";

describe("admin authorization", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when ADMIN_EMAILS is not configured", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    vi.stubEnv("CONTACT_EMAIL", "boris@popcha.com");
    expect(isAdminEmail("boris@popcha.com")).toBe(false);
  });

  it("allows only explicitly configured admin emails", () => {
    vi.stubEnv("ADMIN_EMAILS", "boris@popcha.com, other@example.com");
    expect(isAdminEmail("BORIS@POPCHA.COM")).toBe(true);
    expect(isAdminEmail("visitor@example.com")).toBe(false);
  });
});
