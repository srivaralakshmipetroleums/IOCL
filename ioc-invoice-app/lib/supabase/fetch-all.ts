const PAGE_SIZE = 1000;
const ID_CHUNK = 100;

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[] | null>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const batch = (await fetchPage(from, from + PAGE_SIZE - 1)) ?? [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function fetchByIdsInChunks<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>
): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    all.push(...(await fetchChunk(chunk)));
  }
  return all;
}
