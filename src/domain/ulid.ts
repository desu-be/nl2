/**
 * ULID: 48-bit millisecond time + 80 random bits, in Crockford base32 (26 characters). Unique without
 * coordination between devices, and sortable by creation time.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(now: number, randomBytes: (length: number) => Uint8Array): string {
  let time = '';
  let rest = Math.floor(now);
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[rest % 32] + time;
    rest = Math.floor(rest / 32);
  }
  // 80 bits = 16 characters of 5 bits each.
  const bytes = randomBytes(10);
  let bits = 0;
  let buffer = 0;
  let random = '';
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      random += ALPHABET[(buffer >> bits) & 31];
    }
  }
  return time + random;
}
