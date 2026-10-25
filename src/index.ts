import { definePlugin, type GzvApi, type PluginContext } from "@gzv/plugin-sdk";

const ICON_CHAT = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.1A8.5 8.5 0 1 1 21 12Z"/></svg>`;
const ICON_X = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;

export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function readable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#111" : "#fff";
}

function css(accent: string) {
  const on = readable(accent);
  return `
:root{--a:${accent};--on:${on}}
.l{position:fixed;inset:0;display:grid;place-items:center}
.fab{width:56px;height:56px;border-radius:20px;border:0;cursor:pointer;background:var(--a);color:var(--on);display:grid;place-items:center;box-shadow:0 10px 30px -8px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .2s}
.fab:hover{transform:translateY(-2px) scale(1.03)}
.p{position:fixed;inset:0;display:flex;flex-direction:column;background:#fff;color:#14141a;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);animation:in .32s cubic-bezier(.2,.8,.2,1)}
@keyframes in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.h{padding:22px 22px 18px;background:linear-gradient(135deg,var(--a),color-mix(in srgb,var(--a) 55%,#000));color:var(--on);position:relative}
.h small{opacity:.75;font-size:11px;letter-spacing:.18em;text-transform:uppercase}
.h h2{margin:6px 0 0;font-size:20px;line-height:1.25;font-weight:700;letter-spacing:-.01em}
.x{position:absolute;right:14px;top:14px;width:32px;height:32px;border-radius:12px;border:0;background:rgba(255,255,255,.18);color:inherit;display:grid;place-items:center;cursor:pointer}
.b{padding:18px 20px 20px;overflow:auto;flex:1}
.q{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px}
.q button{border:1px solid #ececf1;background:#fafafc;border-radius:14px;padding:12px 8px;font:600 13px/1.2 inherit;cursor:pointer;color:#14141a}
.q button:hover{border-color:var(--a)}
form{margin-top:16px;display:grid;gap:10px}
input,textarea{width:100%;border:1px solid #e4e4ea;border-radius:12px;padding:11px 12px;font:14px/1.4 inherit;background:#fff;color:#14141a;outline:none}
input:focus,textarea:focus{border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 18%,transparent)}
.s{border:0;border-radius:14px;padding:12px;background:#14141a;color:#fff;font:600 14px inherit;cursor:pointer}
.s[disabled]{opacity:.5}
.ok{text-align:center;padding:30px 10px}.ok b{display:block;font-size:18px;margin-bottom:6px}
.e{color:#c0264b;font-size:12px}
.f{padding:10px;text-align:center;font-size:10px;color:#9a9aa6;border-top:1px solid #f0f0f4}
`;
}

export function render(root: HTMLElement, ctx: PluginContext, gzv: GzvApi) {
  const s = ctx.settings;
  const vi = ctx.lang !== "en";
  const style = document.createElement("style");
  style.textContent = css(ctx.accent || "#5b4cf0");
  document.head.appendChild(style);

  const closed = () => {
    gzv.expand(false);
    root.innerHTML = `<div class="l"><button class="fab" aria-label="${vi ? "Liên hệ" : "Contact"}">${ICON_CHAT}</button></div>`;
    root.querySelector("button")!.addEventListener("click", open);
  };

  const open = () => {
    gzv.expand(true);
    const quick: string[] = [];
    if (s.phone) quick.push(`<button data-u="tel:${esc(s.phone)}">📞 ${vi ? "Gọi" : "Call"}</button>`);
    if (s.zalo) quick.push(`<button data-u="https://zalo.me/${esc(String(s.zalo).replace(/\D/g, ""))}">💬 Zalo</button>`);
    if (s.email) quick.push(`<button data-u="mailto:${esc(s.email)}">✉️ Email</button>`);
    root.innerHTML = `<div class="p" role="dialog">
      <div class="h"><small>${esc(ctx.site.name)}</small><h2>${esc(s.headline || (vi ? "Bạn cần tư vấn?" : "Need a hand?"))}</h2><button class="x" aria-label="Đóng">${ICON_X}</button></div>
      <div class="b">
        ${quick.length ? `<div class="q">${quick.join("")}</div>` : ""}
        ${s.showForm !== false ? `<form novalidate>
          <input name="name" placeholder="${vi ? "Tên của bạn" : "Your name"}" autocomplete="name" required maxlength="120">
          <input name="phone" placeholder="${vi ? "Số điện thoại" : "Phone"}" autocomplete="tel" inputmode="tel" maxlength="40">
          <textarea name="message" rows="3" placeholder="${vi ? "Lời nhắn" : "Message"}" maxlength="1000"></textarea>
          <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
          <p class="e" hidden></p>
          <button class="s" type="submit">${vi ? "Gửi lời nhắn" : "Send"}</button>
        </form>` : ""}
      </div>
      <div class="f">Plugin · GZV</div>
    </div>`;
    root.querySelector(".x")!.addEventListener("click", closed);
    root.querySelectorAll<HTMLButtonElement>("[data-u]").forEach((b) => b.addEventListener("click", () => void gzv.openLink(b.dataset.u!).catch(() => undefined)));
    const form = root.querySelector("form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const err = form.querySelector<HTMLParagraphElement>(".e")!;
      const name = String(fd.get("name") ?? "").trim();
      const phone = String(fd.get("phone") ?? "").trim();
      if (!name || !phone) {
        err.textContent = vi ? "Vui lòng nhập tên và số điện thoại." : "Please enter your name and phone.";
        err.hidden = false;
        return;
      }
      const btn = form.querySelector<HTMLButtonElement>(".s")!;
      btn.disabled = true;
      try {
        await gzv.call("leads.create", { name, phone, message: String(fd.get("message") ?? ""), website: String(fd.get("website") ?? "") });
        root.querySelector(".b")!.innerHTML = `<div class="ok"><b>${vi ? "Đã gửi!" : "Sent!"}</b>${vi ? "Mình sẽ liên hệ lại sớm nhất." : "I'll get back to you soon."}</div>`;
      } catch (x) {
        err.textContent = (vi ? "Chưa gửi được: " : "Could not send: ") + (x instanceof Error ? x.message : "");
        err.hidden = false;
        btn.disabled = false;
      }
    });
  };

  closed();
}

definePlugin((ctx, gzv) => {
  render(document.getElementById("app")!, ctx, gzv);
});
