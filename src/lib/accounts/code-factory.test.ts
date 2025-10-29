import { describe, expect, it } from "vitest";
import { createUniqueCodeFactory } from "@/lib/accounts/code-factory";

describe("createUniqueCodeFactory", () => {
  it("generates unique codes that do not clash with the seed set", async () => {
    const nextCode = await createUniqueCodeFactory(["0AB12", "A1B2C"]);
    const seen = new Set<string>();

    for (let i = 0; i < 20; i++) {
      const code = nextCode();
      expect(code).toMatch(/^[A-Z0-9]{5}$/);
      expect(code).not.toBe("0AB12");
      expect(code).not.toBe("A1B2C");
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  });
});
