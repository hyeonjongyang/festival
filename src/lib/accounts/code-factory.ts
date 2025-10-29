import { prisma } from "@/lib/prisma";
import { generateLoginCode } from "@/lib/utils/code";

const CODE_GENERATION_MAX_ATTEMPTS = 200;

type CodeSet = Set<string>;

function createGeneratorFromSet(existingCodes: CodeSet) {
  return () => {
    for (let attempt = 0; attempt < CODE_GENERATION_MAX_ATTEMPTS; attempt++) {
      const code = generateLoginCode();
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        return code;
      }
    }

    throw new Error("고유 코드를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
  };
}

export type UniqueCodeFactory = () => string;

export async function createUniqueCodeFactory(seedCodes?: Iterable<string>) {
  if (seedCodes) {
    return createGeneratorFromSet(new Set(seedCodes));
  }

  const existingCodes = new Set(
    (
      await prisma.user.findMany({
        select: { code: true },
      })
    ).map((user) => user.code),
  );

  return createGeneratorFromSet(existingCodes);
}
