import { generateNickname } from "@/lib/nickname/generator";

const NICKNAME_MAX_ATTEMPTS = 200;
const NICKNAME_SUFFIX_LIMIT = 9999;
const NICKNAME_SUFFIX_MIN = 2;
const NICKNAME_SUFFIX_SEPARATOR = " ";

type NicknameGenerator = () => string;

type SuffixState = Map<string, number>;

function parseNumericSuffix(nickname: string) {
  const trimmed = nickname.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(NICKNAME_SUFFIX_SEPARATOR);

  if (lastSpaceIndex === -1) {
    return null;
  }

  const suffixPart = trimmed.slice(lastSpaceIndex + 1);

  if (!/^\d+$/.test(suffixPart)) {
    return null;
  }

  const base = trimmed.slice(0, lastSpaceIndex);

  if (!base) {
    return null;
  }

  return {
    base,
    suffix: Number.parseInt(suffixPart, 10),
  };
}

function initializeSuffixState(seed: Iterable<string>): SuffixState {
  const suffixes: SuffixState = new Map();

  for (const nickname of seed) {
    const parsed = parseNumericSuffix(nickname);

    if (parsed) {
      const next = parsed.suffix + 1;
      const current = suffixes.get(parsed.base) ?? NICKNAME_SUFFIX_MIN;
      suffixes.set(parsed.base, Math.max(current, next));
      continue;
    }

    const current = suffixes.get(nickname) ?? NICKNAME_SUFFIX_MIN;
    suffixes.set(nickname, Math.max(current, NICKNAME_SUFFIX_MIN));
  }

  return suffixes;
}

function nextNumberedNickname(
  base: string,
  used: Set<string>,
  suffixes: SuffixState,
) {
  let suffix = Math.max(suffixes.get(base) ?? NICKNAME_SUFFIX_MIN, NICKNAME_SUFFIX_MIN);

  while (suffix <= NICKNAME_SUFFIX_LIMIT) {
    const candidate = `${base}${NICKNAME_SUFFIX_SEPARATOR}${suffix}`;

    if (!used.has(candidate)) {
      suffixes.set(base, suffix + 1);
      used.add(candidate);
      return candidate;
    }

    suffix += 1;
  }

  suffixes.set(base, NICKNAME_SUFFIX_LIMIT + 1);
  return null;
}

export function createUniqueNicknameFactory(
  generator: NicknameGenerator = generateNickname,
  seed?: Iterable<string>,
) {
  const used = new Set(seed ?? []);
  const suffixes = initializeSuffixState(used);

  return () => {
    for (let attempt = 0; attempt < NICKNAME_MAX_ATTEMPTS; attempt++) {
      const nickname = generator();

      if (!used.has(nickname)) {
        used.add(nickname);
        const next = suffixes.get(nickname) ?? NICKNAME_SUFFIX_MIN;
        suffixes.set(nickname, Math.max(next, NICKNAME_SUFFIX_MIN));
        return nickname;
      }

      const numbered = nextNumberedNickname(nickname, used, suffixes);

      if (numbered) {
        return numbered;
      }
    }

    throw new Error("고유 닉네임을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
  };
}
