export function partitionRspMessageIds(
  messageIds: string[],
  processedIds: Set<string>
): { pendingMessageIds: string[]; skippedAlready: number } {
  const pendingMessageIds = messageIds.filter((id) => !processedIds.has(id));
  return {
    pendingMessageIds,
    skippedAlready: messageIds.length - pendingMessageIds.length,
  };
}
