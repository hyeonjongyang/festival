import { prisma } from "@/lib/prisma";
import { createUniqueCodeFactory } from "@/lib/accounts/code-factory";

export type BoothSelfRegistrationInput = {
  boothName: string;
  location?: string | null;
  description?: string | null;
};

export type BoothSelfRegistrationResult = {
  boothId: string;
  boothName: string;
  loginCode: string;
  qrToken: string;
};

export async function registerBoothSelfService(
  input: BoothSelfRegistrationInput,
): Promise<BoothSelfRegistrationResult> {
  const boothName = sanitizeRequired(input.boothName, "부스 이름을 입력해주세요.");
  const location = sanitizeOptional(input.location);
  const description = sanitizeOptional(input.description);

  await ensureUniqueBoothName(boothName);

  const createCode = await createUniqueCodeFactory();

  const { boothId, boothName: savedBoothName, loginCode, qrToken } = await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: {
          role: "BOOTH_MANAGER",
          code: createCode(),
          nickname: `${boothName} 운영팀`,
          nicknameLocked: true,
        },
        select: {
          id: true,
          code: true,
        },
      });

      const booth = await tx.booth.create({
        data: {
          ownerId: user.id,
          name: boothName,
          location,
          description,
        },
        select: { id: true, name: true, qrToken: true },
      });

      return {
        boothId: booth.id,
        boothName: booth.name,
        loginCode: user.code,
        qrToken: booth.qrToken,
      };
    },
  );

  return {
    boothId,
    boothName: savedBoothName,
    loginCode,
    qrToken,
  };
}

async function ensureUniqueBoothName(name: string) {
  const existing = await prisma.booth.findFirst({
    where: { name },
    select: { id: true },
  });

  if (existing) {
    throw new Error("이미 같은 이름의 부스가 존재합니다. 다른 이름을 선택해주세요.");
  }
}

function sanitizeRequired(value: string, errorMessage: string) {
  if (typeof value !== "string") {
    throw new Error(errorMessage);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(errorMessage);
  }

  return trimmed;
}

function sanitizeOptional(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
