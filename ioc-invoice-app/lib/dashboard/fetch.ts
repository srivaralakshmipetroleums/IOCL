export async function fetchDashboardJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `Dashboard request failed (${res.status})`
    );
  }

  return data as T;
}
