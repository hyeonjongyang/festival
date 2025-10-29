import { describe, expect, it } from "vitest";
import { generateQrToken } from "@/lib/students/qr";

describe("generateQrToken", () => {
  it("returns RFC4122 compliant UUID strings", () => {
    const token = generateQrToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
