import type { EventItem, IllustrationEntry, Practice, Summary } from "./types";

let requestQueue = Promise.resolve();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const run = requestQueue.then(async () => {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
    if (!res.ok) {
      const details = await res.text();
      throw new Error(
        `${res.status} ${res.statusText} (${path})${details ? `: ${details}` : ""}`,
      );
    }
    return res.json() as Promise<T>;
  });

  requestQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export const api = {
  practices: (from: string, to: string) =>
    request<Practice[]>(`/api/practices?from=${from}&to=${to}`),
  createPractice: (body: unknown) =>
    request<{ id: string }>("/api/practices", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePractice: (id: string, body: unknown) =>
    request(`/api/practices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePractice: (id: string) =>
    request(`/api/practices/${encodeURIComponent(id)}`, { method: "DELETE" }),

  events: (query = "") =>
    request<EventItem[]>(
      `/api/events${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    ),
  createEvent: (body: unknown) =>
    request<{ id: string }>("/api/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateEvent: (id: string, body: unknown) =>
    request(`/api/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEvent: (id: string) =>
    request(`/api/events/${encodeURIComponent(id)}`, { method: "DELETE" }),

  illustrations: (from: string, to: string) =>
    request<IllustrationEntry[]>(`/api/illustrations?from=${from}&to=${to}`),
  createIllustration: (body: unknown) =>
    request<{ id: string }>("/api/illustrations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateIllustration: (id: string, body: unknown) =>
    request(`/api/illustrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteIllustration: (id: string) =>
    request(`/api/illustrations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  summary: (from: string, to: string) =>
    request<Summary>(`/api/summary?from=${from}&to=${to}`),
};
