# GZV Plugin Starter

> Bộ khởi tạo chính thức để **đối tác** xây dựng plugin cho nền tảng **GZV** (hệ sinh thái `*.gzv.one`, dự án 1000 Genzer).
> Gồm SDK `@gzv/plugin-sdk`, plugin mẫu **Liên hệ nhanh** (`gzv.quick-contact`), CI và công cụ kiểm tra giống hệt server GZV.
>
> 🇬🇧 English summary: [below](#english).
>
> ⚖️ **Source-available, không phải open-source.** Chỉ dành cho đối tác có thoả thuận với GZV. Xem [LICENSE](LICENSE).

[![plugin-ci](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

---

## Mục lục
1. [Mô hình hợp tác](#1-mô-hình-hợp-tác)
2. [Kiến trúc](#2-kiến-trúc)
3. [Cấu trúc repo](#3-cấu-trúc-repo)
4. [Bắt đầu nhanh](#4-bắt-đầu-nhanh)
5. [Manifest](#5-manifest-manifestjson)
6. [Quyền & phạm vi dữ liệu (scopes)](#6-quyền--phạm-vi-dữ-liệu-scopes)
7. [SDK: API & hooks](#7-sdk-api--hooks)
8. [API máy chủ cho backend đối tác](#8-api-máy-chủ-cho-backend-đối-tác)
9. [Phát triển, test, đóng gói](#9-phát-triển-test-đóng-gói)
10. [Nộp & quy trình review](#10-nộp--quy-trình-review)
11. [Phiên bản](#11-phiên-bản)
12. [English](#english)

---

## 1. Mô hình hợp tác
- **Đối tác** (VD: công ty AI) phát triển tích hợp — VNID/eKYC, bảo hiểm, phát hành thẻ, thanh toán, marketing… — **trong repo riêng của mình**, theo kiểu plugin WordPress.
- Đối tác **không truy cập mã nguồn lõi** của GZV. Mọi giao tiếp đi qua SDK (UI sandbox) và API có token, kiểm tra scope.
- Plugin chạy trên các **site portfolio** của GZV (`<slug>.gzv.one`). Chủ site cài plugin từ Marketplace và **đồng ý cấp quyền**.
- **GZV review & phê duyệt** từng bản phát hành (code, bảo mật, hiệu năng) trước khi bật cho site.
- **Chia doanh thu** cấu hình theo từng plugin; doanh thu hiển thị trong cổng đối tác.
- **Sở hữu trí tuệ** của nền tảng/SDK thuộc GZV; quyền với plugin theo thoả thuận đối tác.

## 2. Kiến trúc
```
 Site <slug>.gzv.one                             GZV platform (webservice.gzv.one)
 ┌───────────────────────────────┐              ┌──────────────────────────────┐
 │ loader (chỉ chèn khi site có   │  postMessage │ /plugin-frame/<installId>    │
 │ plugin bật, chạy lúc idle)     │◄────────────►│  iframe sandbox + CSP riêng  │
 │  ├─ kiểm tra scope mỗi lời gọi │              │  └─ bundle của bạn (IIFE)    │
 │  └─ chuyển tiếp → /api/plugins/rt/<installId> ──► kiểm scope, ghi access log │
 └───────────────────────────────┘              └──────────────────────────────┘
 Backend đối tác ── Bearer pit_… ──► /api/plugins/v1/{site,leads}
 CI đối tác ────── Bearer ppk_… ──► /api/plugins/partner  (op: "submit")
```
Nguyên tắc (theo SDK):
| Nguyên tắc | Cách thực thi |
|---|---|
| **Mặc định từ chối** | Không có quyền gì nếu manifest không khai báo scope *và* chủ site không đồng ý khi cài. |
| **Không truy cập DB** | UI chạy trong iframe `sandbox="allow-scripts allow-forms"`, origin mờ, `connect-src 'none'` (trừ `network`). Backend dùng token per-install. |
| **Không tốn chi phí khi không dùng** | Site không có plugin bật → không chèn gì. Plugin tải sau `requestIdleCallback`; slot section `loading="lazy"`. |
| **Ngân sách kích thước** | `budget.jsKb` (trần nền tảng 100 KB) kiểm tra ở CI và lúc submit. |
| **Fail closed** | Không gửi `ready` trong 12 s, lỗi trước khi ready, hoặc ≥ 3 lỗi → frame bị gỡ khỏi trang và lỗi được báo về GZV; lỗi lặp lại có thể khiến bản cài bị `auto_disabled`. |
| **CSP riêng từng plugin** | `script-src 'sha256-…'` ghim đúng bundle đã duyệt; `connect-src` = danh sách `network`; `form-action 'none'`. |
| **Review bởi con người** | `draft → submitted → approved / rejected → disabled`. Chỉ bản approved được phát hành; admin có thể rollback về bản approved trước. |

## 3. Cấu trúc repo
```
.
├─ manifest.json              # manifest plugin mẫu gzv.quick-contact
├─ src/index.ts               # UI plugin mẫu (definePlugin)
├─ packages/plugin-sdk/       # @gzv/plugin-sdk 1.0.0 (npm workspace cục bộ, không cần repo private)
│  └─ src/{index,client,manifest}.ts
├─ scripts/check.mjs          # validate manifest + size budget + security scan (giống server)
├─ scripts/package.mjs        # đóng gói release/<id>-<version>/ + SHA256SUMS
├─ scripts/submit.mjs         # nộp review qua API đối tác (cần GZV_PARTNER_KEY)
├─ test/                      # node:test — manifest, bundle, SDK, helper UI
└─ .github/                   # CI, issue/PR templates
```

## 4. Bắt đầu nhanh
Yêu cầu: Node ≥ 20 (khuyến nghị 22), npm ≥ 10.
```bash
# 1) "Use this template" → tạo repo RIÊNG của bạn, rồi:
git clone <repo-cua-ban> && cd <repo-cua-ban>
npm ci
npm run ci          # typecheck → build → test → check
```
| Lệnh | Tác dụng |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict) cho `src/`, SDK, test |
| `npm run build` | esbuild → `dist/plugin.js` (một bundle IIFE, minify, ES2020) |
| `npm test` | `node --test` qua `tsx` |
| `npm run check` | `validateManifest` + `scanBundle` — **cùng luật server GZV áp dụng khi submit** |
| `npm run package` | tạo `release/<id>-<version>/{manifest.json,plugin.js,SHA256SUMS}` |
| `npm run submit` | nộp bản build lên GZV (cần `GZV_PARTNER_KEY`) |

Biến plugin mẫu thành plugin của bạn: đổi `id` thành `<partner-slug>.<ten-plugin>`, cập nhật `name/author/scopes/slots/settings/budget`, viết lại `src/index.ts`.

## 5. Manifest (`manifest.json`)
Được kiểm bởi `validateManifest()` trong `packages/plugin-sdk/src/manifest.ts`.

| Trường | Bắt buộc | Luật |
|---|---|---|
| `id` | ✔ | `^[a-z0-9]+(\.[a-z0-9-]+)+$`, ≤ 64 ký tự, dạng `doitac.ten-plugin` |
| `name` | ✔ | ≤ 60 ký tự |
| `version` | ✔ | semver `X.Y.Z[-pre]` |
| `description` | ✔ | ≤ 400 ký tự |
| `category` | ✔ | `utility` `contact` `identity` `insurance` `payments` `cards` `marketing` `analytics` |
| `icon` |  | emoji hoặc URL https, ≤ 300 ký tự |
| `author.name` | ✔ | ≤ 80 ký tự (`url`, `email` tuỳ chọn) |
| `sdk` | ✔ | phải là `1.x` (VD `"^1.0.0"`) |
| `entry` | ✔ | đường dẫn bundle, VD `dist/plugin.js` |
| `scopes` | ✔ | mảng (có thể rỗng), không trùng, chỉ các scope ở mục 6 |
| `slots` | ✔ | 1–3 phần tử `{ slot, height? }`; `slot` ∈ `floating`, `section:end`, `section:before-footer`; `height` 40–1200 |
| `hooks` |  | ⊆ `page:view`, `lead:created`, `theme:change` |
| `settings` |  | ≤ 30 trường `{ key, type, label, help?, default?, options?, required?, maxLength? }`; `key` `^[a-zA-Z][a-zA-Z0-9_]{0,39}$`, duy nhất; `type` ∈ `text textarea boolean select color url phone`; `select` cần `options` |
| `network` |  | ≤ 5 origin `https://host[:port]` (không path); **cần scope `network:external`** |
| `budget.jsKb` | ✔ | > 0 và ≤ 100 (`MAX_BUNDLE_KB`) |

`settings` được hiển thị thành form cho chủ site, giá trị đến plugin qua `ctx.settings`. Scope dự phòng (`reserved`) chỉ cho cảnh báo, cần duyệt riêng.

## 6. Quyền & phạm vi dữ liệu (scopes)
| Scope | Bề mặt | Rủi ro | Ý nghĩa |
|---|---|---|---|
| `site:read` | client | low | Hồ sơ công khai của site (tên, chức danh, ảnh…) — action `site.read` |
| `leads:create` | client | medium | Gửi liên hệ vào hộp thư chủ site (rate-limit, honeypot) — action `leads.create` |
| `links:open` | client | low | Mở `tel:` `mailto:` `sms:`, `https://zalo.me/...`, hoặc https thuộc `network` — action `links.open` |
| `leads:read` | server | high | Đọc danh sách liên hệ của site (`GET /api/plugins/v1/leads`) |
| `network:external` | client | high | `fetch` tới các origin trong `network` |
| `identity:verify` | server | high · **dự phòng** | eKYC/VNID — cần hợp đồng & duyệt riêng |
| `payments:create` | server | high · **dự phòng** | Thanh toán — cần hợp đồng & duyệt riêng |

Bảng gốc: `PLUGIN_SCOPES`; action ↔ scope: `ACTION_SCOPES`. Gọi action khi chưa được cấp → reject `scope_denied`; link không hợp lệ → `link_denied`.
Tích hợp VNID / bảo hiểm / thẻ / thanh toán sẽ dùng scope dự phòng tương ứng; hiện chưa có API công khai cho các scope này — liên hệ GZV để thống nhất hợp đồng trước khi xây phần server.

## 7. SDK: API & hooks
Toàn bộ những gì `@gzv/plugin-sdk` 1.0.0 export (`packages/plugin-sdk/src`):

**Runtime (UI, chạy trong iframe)**
```ts
import { definePlugin } from "@gzv/plugin-sdk";

definePlugin(async (ctx, gzv) => {
  // ctx: PluginContext
  //   { installId, pluginId, version, slot, lang: "vi"|"en", accent, site: {name, slug}, settings, scopes }
  const site = await gzv.call("site.read");                       // cần site:read
  await gzv.call("leads.create", { name, phone, message });       // cần leads:create
  await gzv.openLink("tel:0900000000");                           // cần links:open
  gzv.expand(true);     // slot floating: launcher → panel (false để thu lại)
  gzv.resize(480);      // slot section: đặt chiều cao (host kẹp 40–1200)
  const off = gzv.on("page:view", (d) => { /* d = { path } */ });
  gzv.reportError("msg"); // báo lỗi (≤ 500 ký tự)
});
```
| API `GzvApi` | Ghi chú |
|---|---|
| `call<T>(action, payload?)` | `action` ∈ `site.read`, `leads.create`, `links.open`. Timeout 15 s → `Error("timeout")`. |
| `resize(height)` | Chỉ có tác dụng với slot section. |
| `expand(open)` | Chỉ có tác dụng với slot `floating` (desktop 384×580, mobile gần full màn hình). |
| `openLink(url)` | = `call("links.open", { url })`. |
| `on(hook, cb)` → `unsubscribe` | Hook: `page:view`, `lead:created`, `theme:change`. **Lưu ý:** host hiện tại chỉ phát `page:view` (`{ path }`) ngay sau khi plugin `ready`; hai hook còn lại đã có trong spec nhưng chưa được phát. |
| `reportError(message)` | Lỗi `window.error`/`unhandledrejection` được tự động báo. |

`definePlugin` không làm gì nếu không chạy trong iframe (an toàn khi import trong test/Node). Vòng đời: SDK gửi `hello` → host gửi `init` (context) → `setup()` chạy → SDK gửi `ready`. Plugin phải `ready` trong 12 s.

**Tiện ích manifest (dùng trong CI/test)**
`SDK_VERSION`, `MAX_BUNDLE_KB`, `PLUGIN_SCOPES`, `ACTION_SCOPES`, `PLUGIN_SLOTS`, `PLUGIN_HOOKS`, `PLUGIN_CATEGORIES`,
`validateManifest(input)`, `scanBundle(code, manifest)`, `FORBIDDEN_PATTERNS`, `compareSemver(a, b)`, và các type
`PluginManifest`, `PluginScope`, `PluginAction`, `PluginSlot`, `PluginHook`, `PluginCategory`, `SettingField`, `SettingType`,
`ScopeInfo`, `ScopeRisk`, `ValidationResult`, `BundleReport`, `PluginContext`, `GzvApi`.

**Security scan** (`FORBIDDEN_PATTERNS`) chặn: `eval()`, `new Function()`, `document.cookie`, `top/parent.location`, `importScripts`, `import("http…")`, `<script src=…>`, `WebSocket`.

## 8. API máy chủ cho backend đối tác
Cổng đối tác cấp token per-install `pit_…` (chỉ hiển thị một lần; GZV chỉ lưu hash). Giữ token ở **backend**, không đưa vào bundle.
```
GET  https://webservice.gzv.one/api/plugins/v1/site    Authorization: Bearer pit_…   (site:read)
GET  https://webservice.gzv.one/api/plugins/v1/leads   Authorization: Bearer pit_…   (leads:read)
POST https://webservice.gzv.one/api/plugins/v1/leads   {name, phone, message}        (leads:create)
```
Mọi lời gọi đều được kiểm scope và ghi nhật ký truy cập.

## 9. Phát triển, test, đóng gói
- **Dev:** sửa `src/`, chạy `npm run build` (thêm `-- --watch` nếu muốn). Plugin chỉ thực sự chạy trong frame do GZV cấp; để xem trên site thật, nộp bản **draft** (`GZV_DRAFT=1 npm run submit`) và cài thử trên site test của bạn theo hướng dẫn trong cổng đối tác.
- **Test:** viết test `node:test` trong `test/` (`*.test.mjs` hoặc `*.test.ts`). Tách logic thuần (như `esc`, `readable` trong mẫu) để test được không cần DOM.
- **Kiểm tra:** `npm run check` phải pass — server chạy lại đúng các luật này khi submit.
- **Đóng gói:** `npm run package` → `release/<id>-<version>/` gồm `manifest.json`, `plugin.js`, `SHA256SUMS` (dùng khi tải lên thủ công / đối chiếu).
- Bundle phải **tự chứa** (một file IIFE): không dynamic import, không CDN.

## 10. Nộp & quy trình review
1. **Nộp:**
   - Thủ công tại **https://webservice.gzv.one/partner/plugins**, hoặc
   - Tự động từ CI: thêm secret `GZV_PARTNER_KEY` (`ppk_…`, tạo trong cổng đối tác → *API key cho CI*), rồi push tag `vX.Y.Z` khớp `manifest.version`. Job `submit` gọi `POST /api/plugins/partner` với `{ op: "submit", manifest, bundle, changelog, draft }`.
2. **GZV review** từng bản: manifest & scope (tối thiểu, có lý do), **bảo mật** (đọc code, scan tự động, xử lý dữ liệu cá nhân), **hiệu năng** (kích thước, thời gian ready, không chặn trang), báo cáo test.
3. **Kết quả:** `approved` hoặc `rejected` (kèm lý do). Bản approved được phát hành cho các site đã cài; admin có thể **rollback** về bản approved trước đó hoặc `disabled` khi có sự cố.
4. Chủ site vẫn phải bật plugin và đồng ý scope trên site của họ.

## 11. Phiên bản
- Plugin: **SemVer**. Mỗi lần nộp phải **tăng** `version` (so sánh bằng `compareSemver`). PATCH = sửa lỗi; MINOR = tính năng tương thích; MAJOR = thay đổi phá vỡ / **thêm scope** (chủ site cần đồng ý lại).
- Tag git `vX.Y.Z` phải trùng `manifest.version` (CI kiểm tra).
- SDK: nền tảng hiện hỗ trợ `sdk: "^1.x"`. SDK được vendor trong `packages/plugin-sdk` — không tự sửa; cập nhật bằng cách kéo phiên bản mới từ template này.

---

<a id="english"></a>
## 🇬🇧 English

**What this is.** The official starter for partners building plugins for the GZV platform (portfolio sites on `<slug>.gzv.one`). It ships the `@gzv/plugin-sdk` 1.0.0 SDK as a local npm workspace (no private repo needed), the sample plugin **gzv.quick-contact**, CI, and the same validation/scan rules the GZV server enforces.

**Partnership model.** Partners build integrations (VNID/eKYC, insurance, card issuing, payments, …) in their **own repos**, WordPress-plugin style, with **no access to GZV core source**. GZV reviews and approves every release before it is enabled. Revenue share is configured per plugin. IP in the platform/SDK stays with GZV; plugin rights follow the partner agreement. This repo is **source-available, not open source** — see [LICENSE](LICENSE).

**Architecture.** Each plugin runs in its own sandboxed iframe (`allow-scripts allow-forms`, opaque origin) with a per-plugin CSP that pins the approved bundle hash and limits `connect-src` to `manifest.network`. The only channel out is `postMessage` to the host loader, which checks scopes and forwards to the platform API. Nothing is injected on sites with no enabled plugins; plugins load on idle. A plugin that is not `ready` within 12 s, errors before ready, or errors ≥ 3 times is removed from the page.

**Quick start.**
```bash
npm ci
npm run ci   # typecheck → build (dist/plugin.js) → test → check
npm run package   # release/<id>-<version>/ with SHA256SUMS
```

**Manifest & scopes.** See sections 5–6 above (tables are language-neutral). Client actions: `site.read` (`site:read`), `leads.create` (`leads:create`), `links.open` (`links:open`). Server scopes: `leads:read`; `network:external` enables `fetch` to listed origins. `identity:verify` and `payments:create` are reserved and need a separate agreement.

**SDK surface (exactly what is exported).** `definePlugin(setup)` with `ctx: PluginContext` and `gzv: GzvApi` = `call`, `resize`, `expand`, `openLink`, `on`, `reportError`; plus `validateManifest`, `scanBundle`, `compareSemver`, `FORBIDDEN_PATTERNS` and the constants/types listed in section 7. Hooks in the spec: `page:view`, `lead:created`, `theme:change` — the current host emits only `page:view` (`{ path }`).

**Server API.** Per-install token `pit_…` (backend only): `GET /api/plugins/v1/site`, `GET|POST /api/plugins/v1/leads` on `https://webservice.gzv.one`.

**Submission & review.** Submit at `https://webservice.gzv.one/partner/plugins`, or push a `vX.Y.Z` tag with the `GZV_PARTNER_KEY` (`ppk_…`) secret set so CI submits. GZV reviews code, security and performance; versions go `draft → submitted → approved/rejected → disabled`, with one-click rollback to an earlier approved version.

**Versioning.** SemVer; every submission must increase `version`; the git tag must equal the manifest version; adding scopes is a MAJOR change. The platform currently accepts SDK `1.x`.

Security: see [SECURITY.md](SECURITY.md). Contributing: see [CONTRIBUTING.md](CONTRIBUTING.md).
