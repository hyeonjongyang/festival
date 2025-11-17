import { prisma } from "@/lib/prisma";

const FLAG_KEY = "booth-registration";
const DEFAULT_STATE = true;

type FeatureFlagDelegate = typeof prisma.featureFlag;

function getFeatureFlagDelegate(): FeatureFlagDelegate | undefined {
  const client = prisma as typeof prisma & {
    featureFlag?: FeatureFlagDelegate;
  };

  return client.featureFlag;
}

export async function isBoothRegistrationOpen() {
  const featureFlag = getFeatureFlagDelegate();

  if (!featureFlag) {
    console.warn(
      "[feature-flag] Prisma client is missing the FeatureFlag delegate. Did you run `npx prisma generate`?",
    );
  }

  const flag = featureFlag
    ? await featureFlag.findUnique({
        where: { key: FLAG_KEY },
        select: { enabled: true },
      })
    : null;

  return flag?.enabled ?? DEFAULT_STATE;
}

export async function setBoothRegistrationOpen(enabled: boolean) {
  const featureFlag = getFeatureFlagDelegate();

  if (!featureFlag) {
    throw new Error(
      "FeatureFlag delegate가 존재하지 않습니다. `npx prisma generate` 를 다시 실행해주세요.",
    );
  }

  const flag = await featureFlag.upsert({
    where: { key: FLAG_KEY },
    update: { enabled },
    create: { key: FLAG_KEY, enabled },
    select: { enabled: true },
  });

  return flag.enabled;
}
