# Đóng góp & quy trình đối tác / Contributing

Repo này là **template**. Đối tác **không** gửi plugin vào repo này — mỗi đối tác tạo repo **riêng** từ template
(*Use this template* → repo private của bạn), phát triển ở đó, rồi nộp bản phát hành qua cổng đối tác.

## Quy trình làm việc
1. **Tạo repo từ template** (khuyến nghị để private).
2. Đổi `manifest.json`: `id` = `<partner-slug>.<plugin>` (GZV cấp `partner-slug`), `name`, `author`, `scopes`, `slots`, `settings`, `budget`.
3. Viết UI trong `src/` bằng `definePlugin` của `@gzv/plugin-sdk`.
4. `npm run ci` phải xanh trước mỗi PR/tag.
5. Tăng `version` (semver) + ghi `CHANGELOG.md`, tag `vX.Y.Z`, push → CI build/test/check và (nếu có `GZV_PARTNER_KEY`) nộp review.
6. Theo dõi trạng thái ở `https://webservice.gzv.one/partner/plugins`.

## Quy ước code
- TypeScript strict, không thêm dependency runtime nặng (ngân sách bundle tối đa 100 KB, nên < 30 KB).
- Không sửa `packages/plugin-sdk/` trong repo của bạn; SDK được GZV cập nhật — kéo bản mới từ template.
- Commit message rõ ràng (khuyến nghị [Conventional Commits](https://www.conventionalcommits.org/)).
- Một PR = một thay đổi; điền đầy đủ PR template, đặc biệt **lý do xin scope**.

## Góp ý cho SDK / template
Mở issue (bug / feature request) trong repo này. Thay đổi SDK do GZV thực hiện ở nền tảng chính và đồng bộ ra đây.

## English summary
Create your own repo from this template, build your plugin there, keep `npm run ci` green, bump the semver version,
tag `vX.Y.Z`, and submit through the partner portal or CI. Do not modify the vendored SDK. Never commit secrets.
By contributing you agree to the terms in `LICENSE`.
