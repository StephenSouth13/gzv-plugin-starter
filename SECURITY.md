# Bảo mật / Security Policy

## Báo cáo lỗ hổng / Reporting a vulnerability
**Không mở issue công khai cho lỗ hổng bảo mật.** Hãy báo riêng qua:
- GitHub → tab **Security** → *Report a vulnerability* (private advisory) của repo này, hoặc
- Kênh liên hệ đối tác trong cổng `https://webservice.gzv.one/partner/plugins`.

Vui lòng gửi: mô tả, bước tái hiện, ảnh hưởng, phiên bản SDK/plugin. GZV phản hồi trong 3 ngày làm việc.
Please report privately (GitHub private advisory or the partner portal). Do not open public issues.

## Phạm vi / Scope
- `@gzv/plugin-sdk` (bridge postMessage, `validateManifest`, `scanBundle`)
- Cơ chế sandbox / CSP / scope của plugin trên site `*.gzv.one`
- Plugin mẫu `gzv.quick-contact`

Thử nghiệm chỉ trên site/tài khoản của chính bạn. Cấm tấn công dữ liệu người dùng thật, DoS, social engineering.

## Quy tắc bắt buộc với plugin / Mandatory rules for plugins
- **Không bao giờ commit secret.** `GZV_PARTNER_KEY` (`ppk_…`) chỉ để trong GitHub Actions secrets; token per-install (`pit_…`) chỉ ở backend của đối tác, không bao giờ trong bundle UI.
- Xin **scope tối thiểu**; mọi dữ liệu người dùng (VNID/eKYC, bảo hiểm, thẻ, thanh toán) phải tuân thủ pháp luật Việt Nam về bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) và thoả thuận đối tác.
- Không `eval`/`new Function`, không tải script từ xa, không đọc cookie, không điều hướng trang cha, không WebSocket — `npm run check` và server GZV đều chặn.
- Gọi mạng ra ngoài chỉ tới origin khai báo trong `manifest.network` (cần scope `network:external`); CSP của frame chặn mọi thứ khác.
- Nếu key bị lộ: thu hồi/tạo lại ngay trong cổng đối tác và báo GZV.
