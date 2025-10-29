const CODE_LENGTH = 5;
const CODE_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Generates a 5-character uppercase alphanumeric code used for credential logins.
 */
export function generateLoginCode(): string {
  let attempt = "";

  while (attempt.length < CODE_LENGTH) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARACTERS.length);
    attempt += CODE_CHARACTERS[randomIndex] ?? "";
  }

  return attempt;
}
