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

  it("creates composite indexes for visit throttling", () => {
    expect(schemaSource).toContain("@@index([studentId, visitedAt])");
    expect(schemaSource).toContain("@@index([boothId, visitedAt])");
  });

  it("keeps login codes unique for each student and QR 토큰 unique per booth", () => {
    const user = getModel("User");
    const uniqueFields = user.fields
      .filter((field) => field.isUnique)
      .map((field) => field.name);

    expect(uniqueFields).toContain("code");

    const booth = getModel("Booth");
    const boothUniqueFields = booth.fields
      .filter((field) => field.isUnique)
      .map((field) => field.name);

    expect(boothUniqueFields).toContain("qrToken");
  });
});
