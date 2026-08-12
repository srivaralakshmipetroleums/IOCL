import { createHash } from "crypto";

export function computePdfHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
