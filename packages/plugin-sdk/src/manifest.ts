/**
 * GZV Plugin manifest — the single contract between a partner plugin and the
 * platform. Zero dependencies so it can be shared by the app (server-side
 * validation at submit time), the SDK and the partner's CI.
 */

export const SDK_VERSION = "1.0.0";
/** Hard platform cap; a manifest may only ask for less. */
export const MAX_BUNDLE_KB = 100;

export type ScopeRisk = "low" | "medium" | "high";
export interface ScopeInfo {
  label: string;
  risk: ScopeRisk;
  /** client = callable from the sandboxed UI; server = per-install token API. */
  surface: "client" | "server";
  /** Reserved for future modules; admins must approve explicitly. */
  reserved?: boolean;
}

export const PLUGIN_SCOPES = {
  "site:read": {
    label: "Đọc hồ sơ công khai của site (tên, chức danh, ảnh)",
    risk: "low",
    surface: "client",
  },
  "leads:create": {
    label: "Gửi liên hệ vào hộp thư của chủ site",
    risk: "medium",
    surface: "client",
  },
  "links:open": {
    label: "Mở liên kết gọi điện / email / Zalo cho người xem",
    risk: "low",
    surface: "client",
  },
  "leads:read": {
    label: "Đọc danh sách liên hệ của site (API máy chủ)",
    risk: "high",
    surface: "server",
  },
  "network:external": {
    label: "Gọi API bên ngoài trong danh sách cho phép",
    risk: "high",
    surface: "client",
  },
  "identity:verify": {
    label: "Xác thực danh tính / eKYC (dự phòng)",
    risk: "high",
    surface: "server",
    reserved: true,
  },
  "payments:create": {
    label: "Tạo giao dịch thanh toán (dự phòng)",
    risk: "high",
    surface: "server",
    reserved: true,
  },
} as const satisfies Record<string, ScopeInfo>;
export type PluginScope = keyof typeof PLUGIN_SCOPES;

/** Client-side bridge actions and the scope each one needs. */
export const ACTION_SCOPES = {
  "site.read": "site:read",
  "leads.create": "leads:create",
  "links.open": "links:open",
} as const satisfies Record<string, PluginScope>;
export type PluginAction = keyof typeof ACTION_SCOPES;

export const PLUGIN_SLOTS = ["floating", "section:end", "section:before-footer"] as const;
export type PluginSlot = (typeof PLUGIN_SLOTS)[number];

export const PLUGIN_HOOKS = ["page:view", "lead:created", "theme:change"] as const;
export type PluginHook = (typeof PLUGIN_HOOKS)[number];

export const PLUGIN_CATEGORIES = [
  "utility",
  "contact",
  "identity",
  "insurance",
  "payments",
  "cards",
  "marketing",
  "analytics",
] as const;
export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

export type SettingType = "text" | "textarea" | "boolean" | "select" | "color" | "url" | "phone";
export interface SettingField {
  key: string;
  type: SettingType;
  label: string;
  help?: string;
  default?: string | boolean;
  options?: { value: string; label: string }[];
  required?: boolean;
  maxLength?: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: PluginCategory;
  icon?: string;
  author: { name: string; url?: string; email?: string };
  sdk: string;
  entry: string;
  scopes: PluginScope[];
  slots: { slot: PluginSlot; height?: number }[];
  hooks?: PluginHook[];
  settings?: SettingField[];
  /** https origins reachable via fetch (needs network:external). */
  network?: string[];
  budget: { jsKb: number };
}

export type ValidationResult =
  | { ok: true; manifest: PluginManifest; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

const ID_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const SETTING_TYPES: SettingType[] = [
  "text",
  "textarea",
  "boolean",
  "select",
  "color",
  "url",
  "phone",
];

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

export function validateManifest(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["manifest phải là một object JSON"], warnings };
  const m = input;
  if (!str(m.id, 64) || !ID_RE.test(m.id as string))
    errors.push("id: dạng 'nhaphattrien.ten-plugin' (a-z, 0-9, -)");
  if (!str(m.name, 60)) errors.push("name: bắt buộc, ≤ 60 ký tự");
  if (!str(m.version, 32) || !SEMVER_RE.test(m.version as string))
    errors.push("version: phải là semver, ví dụ 1.0.0");
  if (!str(m.description, 400)) errors.push("description: bắt buộc, ≤ 400 ký tự");
  if (!PLUGIN_CATEGORIES.includes(m.category as PluginCategory))
    errors.push(`category: một trong ${PLUGIN_CATEGORIES.join(", ")}`);
  if (m.icon !== undefined && !str(m.icon, 300)) errors.push("icon: emoji hoặc URL https");
  if (!isObj(m.author) || !str(m.author.name, 80)) errors.push("author.name: bắt buộc");
  if (!str(m.sdk, 20)) errors.push('sdk: ví dụ "^1.0.0"');
  else if (!/^\^?1\./.test(m.sdk as string)) errors.push("sdk: nền tảng hiện hỗ trợ SDK 1.x");
  if (!str(m.entry, 120)) errors.push("entry: đường dẫn bundle, ví dụ dist/plugin.js");

  const scopes = Array.isArray(m.scopes) ? m.scopes : null;
  if (!scopes) errors.push("scopes: mảng (có thể rỗng) — mặc định không có quyền gì");
  else {
    for (const s of scopes) {
      if (!(typeof s === "string" && s in PLUGIN_SCOPES))
        errors.push(`scopes: không hỗ trợ "${String(s)}"`);
      else if ((PLUGIN_SCOPES as Record<string, ScopeInfo>)[s].reserved)
        warnings.push(`scope "${s}" là dự phòng — cần duyệt riêng`);
    }
    if (new Set(scopes).size !== scopes.length) errors.push("scopes: trùng lặp");
  }

  if (!Array.isArray(m.slots) || m.slots.length === 0 || m.slots.length > 3)
    errors.push("slots: 1–3 vị trí hiển thị");
  else
    for (const s of m.slots) {
      if (!isObj(s) || !PLUGIN_SLOTS.includes(s.slot as PluginSlot))
        errors.push(`slots: vị trí không hợp lệ (${PLUGIN_SLOTS.join(", ")})`);
      else if (
        s.height !== undefined &&
        !(typeof s.height === "number" && s.height >= 40 && s.height <= 1200)
      )
        errors.push("slots.height: 40–1200");
    }

  if (m.hooks !== undefined) {
    if (!Array.isArray(m.hooks)) errors.push("hooks: mảng");
    else
      for (const h of m.hooks)
        if (!PLUGIN_HOOKS.includes(h as PluginHook))
          errors.push(`hooks: không hỗ trợ "${String(h)}"`);
  }

  if (m.settings !== undefined) {
    if (!Array.isArray(m.settings) || m.settings.length > 30)
      errors.push("settings: mảng ≤ 30 trường");
    else {
      const keys = new Set<string>();
      for (const f of m.settings) {
        if (!isObj(f) || typeof f.key !== "string" || !KEY_RE.test(f.key)) {
          errors.push("settings.key: chữ/số/_ , bắt đầu bằng chữ");
          continue;
        }
        if (keys.has(f.key)) errors.push(`settings: trùng key "${f.key}"`);
        keys.add(f.key);
        if (!SETTING_TYPES.includes(f.type as SettingType))
          errors.push(`settings.${f.key}.type: ${SETTING_TYPES.join(", ")}`);
        if (!str(f.label, 80)) errors.push(`settings.${f.key}.label: bắt buộc`);
        if (f.type === "select" && (!Array.isArray(f.options) || f.options.length === 0))
          errors.push(`settings.${f.key}.options: bắt buộc với select`);
      }
    }
  }

  if (m.network !== undefined) {
    if (!Array.isArray(m.network) || m.network.length > 5) errors.push("network: tối đa 5 origin");
    else {
      for (const o of m.network) {
        if (typeof o !== "string" || !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o))
          errors.push(`network: "${String(o)}" phải là origin https không có path`);
      }
      if (m.network.length && !(scopes ?? []).includes("network:external"))
        errors.push("network: cần scope network:external");
    }
  }

  if (!isObj(m.budget) || typeof m.budget.jsKb !== "number" || m.budget.jsKb <= 0)
    errors.push("budget.jsKb: số KB tối đa của bundle");
  else if (m.budget.jsKb > MAX_BUNDLE_KB) errors.push(`budget.jsKb: tối đa ${MAX_BUNDLE_KB} KB`);

  if (errors.length) return { ok: false, errors, warnings };
  return { ok: true, manifest: m as unknown as PluginManifest, warnings };
}

/** Patterns that fail the automated security scan (reviewers still read the code). */
export const FORBIDDEN_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\beval\s*\(/, why: "eval()" },
  { re: /\bnew\s+Function\s*\(/, why: "new Function()" },
  { re: /document\.cookie/, why: "đọc cookie" },
  { re: /\b(?:window\.)?(?:top|parent)\.location\b/, why: "điều hướng trang chủ" },
  { re: /\bimportScripts\s*\(/, why: "importScripts" },
  { re: /\bimport\s*\(\s*["'`]https?:/, why: "tải code từ xa" },
  { re: /<script[^>]+src\s*=/i, why: "chèn script từ xa" },
  { re: /\bWebSocket\s*\(/, why: "WebSocket" },
];

export interface BundleReport {
  bytes: number;
  kb: number;
  budgetKb: number;
  withinBudget: boolean;
  findings: string[];
  passed: boolean;
}

export function scanBundle(code: string, manifest: Pick<PluginManifest, "budget">): BundleReport {
  const bytes = new TextEncoder().encode(code).length;
  const kb = Math.round((bytes / 1024) * 10) / 10;
  const budgetKb = Math.min(manifest.budget.jsKb, MAX_BUNDLE_KB);
  const findings = FORBIDDEN_PATTERNS.filter((p) => p.re.test(code)).map((p) => p.why);
  const withinBudget = kb <= budgetKb;
  return {
    bytes,
    kb,
    budgetKb,
    withinBudget,
    findings,
    passed: withinBudget && findings.length === 0,
  };
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.-]/).slice(0, 3).map(Number);
  const pb = b.split(/[.-]/).slice(0, 3).map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}
