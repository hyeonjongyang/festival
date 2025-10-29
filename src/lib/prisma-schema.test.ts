import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

function getModel(name: string) {
  const model = Prisma.dmmf.datamodel.models.find(
    (entry) => entry.name === name,
  );

  if (!model) {
    throw new Error(`Model ${name} not found in Prisma datamodel`);
  }

  return model;
}

describe("Prisma schema integrity", () => {
  const schemaSource = fs.readFileSync(
    path.join(process.cwd(), "prisma", "schema.prisma"),
    "utf8",
  );

  it("enforces a unique heart per user and post", () => {
    const heart = getModel("Heart");
    expect(heart.uniqueFields).toContainEqual(["postId", "userId"]);
  });

  it("creates composite indexes for point log throttling", () => {
    expect(schemaSource).toContain("@@index([studentId, awardedAt])");
    expect(schemaSource).toContain("@@index([boothId, awardedAt])");
  });

  it("keeps login codes and QR tokens unique for each user", () => {
    const user = getModel("User");
    const uniqueFields = user.fields
      .filter((field) => field.isUnique)
      .map((field) => field.name);

    expect(uniqueFields).toContain("code");
    expect(uniqueFields).toContain("qrToken");
  });
});
