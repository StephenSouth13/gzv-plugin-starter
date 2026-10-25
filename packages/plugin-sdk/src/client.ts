/**
 * Runs INSIDE the sandboxed plugin iframe. The only channel to the outside
 * world is postMessage to the host page, which checks scopes before
 * forwarding a call to the platform API.
 */
import type { PluginAction, PluginHook, PluginSlot } from "./manifest";

export interface PluginContext {
  installId: string;
  pluginId: string;
  version: string;
  slot: PluginSlot;
  lang: "vi" | "en";
  accent: string;
  site: { name: string; slug: string };
  settings: Record<string, string | boolean>;
  scopes: string[];
}

export interface GzvApi {
  /** Call a platform action. Rejects with "scope_denied" if not granted. */
  call<T = unknown>(action: PluginAction, payload?: Record<string, unknown>): Promise<T>;
  /** Ask the host to resize the frame (section slots). */
  resize(height: number): void;
  /** Floating slot: expand to a panel or collapse back to the launcher. */
  expand(open: boolean): void;
  /** Open tel:/mailto:/sms: or an allow-listed https link (needs links:open). */
  openLink(url: string): Promise<void>;
  on(hook: PluginHook, cb: (data: unknown) => void): () => void;
  reportError(message: string): void;
}

type Msg = { __gzv: 1; type: string; id?: number; [k: string]: unknown };

export function definePlugin(
  setup: (ctx: PluginContext, gzv: GzvApi) => void | Promise<void>,
): void {
  if (typeof window === "undefined" || window.parent === window) return;
  const host = window.parent;
  const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void }>();
  const listeners = new Map<string, Set<(d: unknown) => void>>();
  let seq = 0;
  const post = (m: Omit<Msg, "__gzv">) => host.postMessage({ __gzv: 1, ...m }, "*");

  const gzv: GzvApi = {
    call(action, payload = {}) {
      const id = ++seq;
      return new Promise((res, rej) => {
        pending.set(id, { res: res as (v: unknown) => void, rej });
        post({ type: "call", id, action, payload });
        setTimeout(() => {
          if (pending.delete(id)) rej(new Error("timeout"));
        }, 15000);
      });
    },
    resize: (height) => post({ type: "resize", height: Math.ceil(height) }),
    expand: (open) => post({ type: "expand", open }),
    openLink: (url) => gzv.call("links.open", { url }).then(() => undefined),
    on(hook, cb) {
      const set = listeners.get(hook) ?? new Set();
      set.add(cb);
      listeners.set(hook, set);
      return () => set.delete(cb);
    },
    reportError: (message) => post({ type: "error", message: String(message).slice(0, 500) }),
  };

  window.addEventListener("error", (e) => gzv.reportError(e.message || "error"));
  window.addEventListener("unhandledrejection", (e) =>
    gzv.reportError(String((e as PromiseRejectionEvent).reason ?? "rejection")),
  );

  window.addEventListener("message", (e: MessageEvent) => {
    if (e.source !== host) return;
    const m = e.data as Msg;
    if (!m || m.__gzv !== 1) return;
    if (m.type === "init") {
      Promise.resolve()
        .then(() => setup(m.context as PluginContext, gzv))
        .then(() => post({ type: "ready" }))
        .catch((err: unknown) => gzv.reportError(err instanceof Error ? err.message : String(err)));
    } else if (m.type === "result" && typeof m.id === "number") {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.ok) p.res(m.data);
      else p.rej(new Error(String(m.error ?? "error")));
    } else if (m.type === "event") {
      listeners.get(String(m.name))?.forEach((cb) => cb(m.data));
    }
  });
  post({ type: "hello", sdk: "1.0.0" });
}
