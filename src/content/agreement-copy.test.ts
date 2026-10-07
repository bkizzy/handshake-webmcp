import { describe, expect, it } from "vitest";

import { counterpartyConfirmationEmailCopy, invitationEmailCopy } from "./agreement-copy";

describe("invitationEmailCopy", () => {
  it("directs offline agent-review results back to the author", () => {
    const content = invitationEmailCopy({
      author: "Acme Corp",
      authorEmail: "contracts@acme.test",
      title: "Mutual NDA",
      recipientEmail: "reviewer@example.test",
    });

    expect(content.body).toContain("either the revised document or a list of proposed revisions");
    expect(content.body).toContain("reply to this email");
    expect(content.body).toContain("Your reply will go directly to Acme Corp at contracts@acme.test");
  });
});

describe("counterpartyConfirmationEmailCopy", () => {
  it("makes attribution conditional on counterparty confirmation", () => {
    const content = counterpartyConfirmationEmailCopy({ title: "Mutual NDA", author: "Acme Corp" });
    expect(content.body).toContain("confirm, correct, or reject");
    expect(content.body).toContain("Nothing is attributed to you");
  });
});
