let csrfToken: string | null = null;

async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/auth/csrf/", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.method && options.method !== "GET") {
    headers["X-CSRFToken"] = await ensureCsrf();
  }

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 403) {
    csrfToken = null;
    headers["X-CSRFToken"] = await ensureCsrf();
    const retry = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
    if (!retry.ok) {
      const body = await retry.json().catch(() => ({}));
      throw new ApiError(retry.status, (body as Record<string, string>).detail ?? "Request failed");
    }
    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as Record<string, string>).detail ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = void>(url: string) => request<T>(url, { method: "DELETE" }),
  postForm: async <T>(url: string, formData: FormData): Promise<T> => {
    const csrf = await ensureCsrf();
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRFToken": csrf },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, (body as Record<string, string>).detail ?? "Request failed");
    }
    return res.json() as Promise<T>;
  },
};
