export async function fetchDashboardJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();

  let data: T & { error?: string };
  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    const snippet = text.trim().slice(0, 200);
    throw new Error(
      snippet || `Dashboard request failed (${res.status} ${res.statusText})`
    );
  }

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `Dashboard request failed (${res.status})`
    );
  }

  return data as T;
}
