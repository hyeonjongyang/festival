import { describe, expect, it } from "vitest";
import { createBoothVisitUrl, extractBoothTokenFromQrPayload } from "@/lib/visits/qr-payload";

describe("extractBoothTokenFromQrPayload", () => {
  it("returns the raw token unchanged", () => {
    expect(extractBoothTokenFromQrPayload("8b0b5df2-5c2f-4c89-b39c-3fb58b1a5c24")).toBe(
      "8b0b5df2-5c2f-4c89-b39c-3fb58b1a5c24",
    );
  });

  it("extracts a token from a /v/:token URL", () => {
    expect(extractBoothTokenFromQrPayload("https://festival.example/v/abc-123")).toBe("abc-123");
  });

  it("extracts a token from a /v/:token path", () => {
    expect(extractBoothTokenFromQrPayload("/v/abc-123")).toBe("abc-123");
  });

  it("extracts a token from a query string", () => {
    expect(extractBoothTokenFromQrPayload("https://festival.example/v?t=abc-123")).toBe("abc-123");
    expect(extractBoothTokenFromQrPayload("https://festival.example/visit?boothToken=abc-123")).toBe("abc-123");
    expect(extractBoothTokenFromQrPayload("https://festival.example/feed?boothToken=abc-123")).toBe("abc-123");
  });

  it("ignores trailing slashes", () => {
    expect(extractBoothTokenFromQrPayload("https://festival.example/v/abc-123/")).toBe("abc-123");
  });

  it("trims whitespace", () => {
    expect(extractBoothTokenFromQrPayload("  /v/abc-123  ")).toBe("abc-123");
  });
});

describe("createBoothVisitUrl", () => {
  it("builds an absolute feed URL with boothToken query", () => {
    expect(createBoothVisitUrl("https://festival.example", "abc-123")).toBe("https://festival.example/feed?boothToken=abc-123");
  });
});
