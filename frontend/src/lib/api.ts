import { supabase } from "./supabase";

export class ApiError extends Error {
  status: number;
  fields: string[];
  constructor(status: number, message: string, fields: string[] = []) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Calls our own server with the user's login token. Turns every failure into a friendly ApiError. */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Could not reach ArthSaathi. Please check your internet and try again.");
  }
  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    let fields: string[] = [];
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      if (Array.isArray(body.fields)) fields = body.fields;
    } catch {
      /* keep the default message */
    }
    throw new ApiError(res.status, detail, fields);
  }
  return (await res.json()) as T;
}
