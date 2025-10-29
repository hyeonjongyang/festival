import { ADJECTIVES } from "./adjectives";
import { ANIMALS } from "./animals";

function randomItem<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateNickname() {
  const adjective = randomItem(ADJECTIVES);
  const animal = randomItem(ANIMALS);
  return `${adjective} ${animal}`;
}

export function generateNicknameSuggestions(count = 3) {
  return Array.from({ length: count }, () => generateNickname());
}
