import { describe, expect, it } from "vitest";
import { getUserDisplayName } from "@/lib/users/display-name";

describe("getUserDisplayName", () => {
  it("formats student IDs when role is STUDENT", () => {
    expect(
      getUserDisplayName({
        role: "STUDENT",
        nickname: "ignored",
        grade: 2,
        classNumber: 3,
        studentNumber: 7,
      }),
    ).toBe("20307");
  });

	  it("falls back to nickname for non-students", () => {
	    expect(
	      getUserDisplayName({
	        role: "BOOTH_MANAGER",
	        nickname: "운영팀",
	        grade: null,
	        classNumber: null,
	        studentNumber: null,
	      }),
	    ).toBe("운영팀");
	  });
	});
