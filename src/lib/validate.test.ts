import { describe, expect, it } from "vitest";
import { isHttpUrl, todayISO, validateDraft } from "./validate";

const now = new Date(2026, 9, 5, 15, 30, 0);

describe("validateDraft", () => {
  it("rejects a blank title", () => {
    const result = validateDraft({ title: "   ", tag: "feature" }, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("Title is required.");
  });

  it("defaults the date to today when the link is empty", () => {
    const result = validateDraft(
      { title: "Shipped the log", link: "  ", tag: "feature", date: "" },
      now,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Shipped the log",
        link: "",
        tag: "feature",
        date: "2026-10-05",
      },
    });
    expect(todayISO(now)).toBe("2026-10-05");
  });

  it("rejects a link that is not a valid URL", () => {
    const result = validateDraft(
      { title: "Notes", link: "not a url", tag: "docs" },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Link must be a valid http or https URL.");
    }
  });

  it("accepts http and https links and rejects other schemes", () => {
    expect(isHttpUrl("https://example.com/ship?id=1")).toBe(true);
    expect(isHttpUrl("http://localhost:5173/log")).toBe(true);
    expect(isHttpUrl("ftp://files.example.com/a")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);

    const https = validateDraft(
      { title: "Docs", link: "https://example.com/ship", tag: "docs", date: "2026-10-01" },
      now,
    );
    expect(https.ok).toBe(true);
    if (https.ok) expect(https.value.link).toBe("https://example.com/ship");
  });

  it("rejects an unknown tag and an impossible date", () => {
    const result = validateDraft(
      { title: "Oops", tag: "launch", date: "2026-02-31" },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Tag must be feature, fix, infra, docs, or other.");
      expect(result.errors).toContain("Date must be a valid calendar date.");
    }
  });
});
