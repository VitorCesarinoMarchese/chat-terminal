export async function postJson(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
  token?: string
) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function getJson(baseUrl: string, path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}
