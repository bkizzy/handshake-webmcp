import { describe, expect, it } from "vitest";

import { isUserActivatedSameOriginNavigation } from "./human-signature";

describe("isUserActivatedSameOriginNavigation", () => {
  it("accepts a user-activated same-origin document navigation", () => {
    const headers = new Headers({
      "sec-fetch-user": "?1",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      "sec-fetch-site": "same-origin",
    });

    expect(isUserActivatedSameOriginNavigation(headers)).toBe(true);
  });

  it("rejects fetch-style and cross-site submissions", () => {
    expect(isUserActivatedSameOriginNavigation(new Headers())).toBe(false);
    expect(isUserActivatedSameOriginNavigation(new Headers({
      "sec-fetch-user": "?1",
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      "sec-fetch-site": "cross-site",
    }))).toBe(false);
  });
});
