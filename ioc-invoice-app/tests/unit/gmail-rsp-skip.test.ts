import { describe, it, expect } from "vitest";
import { partitionRspMessageIds } from "@/lib/gmail/gmail-rsp-skip";

describe("partitionRspMessageIds", () => {
  it("skips IDs that were already processed even when prices share a date", () => {
    const messageIds = ["a", "b", "c", "d"];
    const processed = new Set(["a", "c"]);

    const result = partitionRspMessageIds(messageIds, processed);

    expect(result.skippedAlready).toBe(2);
    expect(result.pendingMessageIds).toEqual(["b", "d"]);
  });

  it("treats a full re-run as already done", () => {
    const messageIds = ["a", "b", "c"];
    const result = partitionRspMessageIds(messageIds, new Set(messageIds));

    expect(result.skippedAlready).toBe(3);
    expect(result.pendingMessageIds).toEqual([]);
  });
});
