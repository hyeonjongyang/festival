import { describe, expect, it } from "vitest";
import { createUniqueNicknameFactory } from "@/lib/accounts/nickname-factory";

describe("createUniqueNicknameFactory", () => {
  it("filters out duplicates even when generator repeats", () => {
    const candidates = [
      "Bright Sparrow",
      "Bright Sparrow",
      "Calm Otter",
      "Swift Falcon",
    ];
    let index = 0;
    const stub = () => {
      const value = candidates[index % candidates.length];
      index += 1;
      return value;
    };

    const nextNickname = createUniqueNicknameFactory(stub);
    const results = [nextNickname(), nextNickname(), nextNickname()];

    expect(new Set(results).size).toBe(results.length);
  });

  it("appends numeric suffixes when the generator repeats endlessly", () => {
    const stub = () => "활기찬 여우";
    const nextNickname = createUniqueNicknameFactory(stub);

    expect(nextNickname()).toBe("활기찬 여우");
    expect(nextNickname()).toBe("활기찬 여우 2");
    expect(nextNickname()).toBe("활기찬 여우 3");
    expect(nextNickname()).toBe("활기찬 여우 4");
  });

  it("continues numbering based on provided seed", () => {
    const seed = ["활기찬 여우", "활기찬 여우 2", "활기찬 여우 4"];
    const stub = () => "활기찬 여우";
    const nextNickname = createUniqueNicknameFactory(stub, seed);

    expect(nextNickname()).toBe("활기찬 여우 5");
    expect(nextNickname()).toBe("활기찬 여우 6");
  });
});
