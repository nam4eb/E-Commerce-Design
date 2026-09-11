# Hướng dẫn Google, Facebook, VNPAY và MoMo

Hệ thống đã tích hợp OAuth Google/Facebook và thanh toán VNPAY/MoMo, bên cạnh COD. Các nút chỉ bật khi đủ cấu hình. Cần tài khoản và khóa riêng của cửa hàng để kiểm thử sandbox và nghiệm thu production. Không đưa secret vào frontend, biến VITE_*, Git hoặc cuộc trò chuyện.

## 1. Chuẩn bị

Yêu cầu Node 24 và pnpm. Sau `pnpm install`, tại thư mục gốc:

```powershell
Copy-Item .env.example .env
# Điền các biến trong .env bằng trình soạn thảo.
node scripts/check-config.mjs
node scripts/dev-api.mjs
```

Mở cửa sổ thứ hai:

```powershell
pnpm --filter @workspace/electronics-store run dev
```

Frontend là `http://localhost:5173`, proxy `/api` tới port5000. `dev-api.mjs` tự đọc `.env` gốc, giải quyết đường dẫn SQLite theo thư mục gốc, build và chạy API. Biến có sẵn trong shell được ưu tiên; thay cấu hình cần restart API. Script này luôn chạy development.

### Chạy bằng Docker Compose

Docker Compose dùng PostgreSQL thay cho SQLite và công khai toàn bộ ứng dụng qua Nginx ở một origin:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Mở `http://localhost:8080`. Với Docker, sửa `DOCKER_PUBLIC_ORIGIN` thay vì PUBLIC_ORIGIN; nếu đổi `WEB_PORT=8090` thì đặt `DOCKER_PUBLIC_ORIGIN=http://localhost:8090`. Xem lỗi bằng `docker compose logs -f api web database`. `docker compose down` giữ volume; thêm `-v` sẽ xóa database và chỉ dùng khi bạn chủ động muốn làm sạch dữ liệu.

PUBLIC_ORIGIN là địa chỉ website khách truy cập, ví dụ `https://shop.example.vn`, không có `/` cuối hoặc đường dẫn `/api`. Production: đặt NODE_ENV=production, DATABASE_URL PostgreSQL và HTTPS. Build API bằng `node build.mjs` trong `artifacts/api-server`, chạy `node dist/index.mjs` với biến môi trường của hệ thống triển khai. Build frontend, phục vụ `artifacts/electronics-store/dist/public`, cấu hình SPA fallback và reverse proxy `/api` tới API; không dùng Vite dev server cho production.

TRUST_PROXY phải khớp IP/mạng proxy thật, ví dụ `loopback` khi proxy cùng máy; không tùy tiện tin mọi proxy. Proxy phải chuyển X-Forwarded-Proto đúng HTTPS. Dùng một hostname chuẩn để cookie và state không bị lệch.

IPN không thể gọi localhost từ Internet. Để thử tại máy cá nhân, dùng tên miền HTTPS tạm trỏ tới frontend5173, khai báo hostname đó trong Vite `server.allowedHosts` (không mở toàn bộ), rồi cập nhật PUBLIC_ORIGIN và dashboard. Script check-config chỉ kiểm tra biến và in URL, không xác minh khóa hay kết nối.

## 2. URL đăng ký

Thay domain bằng PUBLIC_ORIGIN; `node scripts/check-config.mjs` in các URL thực tế mà không in khóa.

| Mục | URL | Phương thức |
|---|---|---|
| Google redirect | `https://shop.example.vn/api/auth/google/callback` | GET |
| Facebook redirect | `https://shop.example.vn/api/auth/facebook/callback` | GET |
| VNPAY Return | `https://shop.example.vn/api/payments/vnpay/return` | GET |
| VNPAY IPN | `https://shop.example.vn/api/payments/vnpay/ipn` | GET |
| MoMo redirectUrl | `https://shop.example.vn/api/payments/momo/return` | GET |
| MoMo ipnUrl | `https://shop.example.vn/api/payments/momo/ipn` | POST JSON |
| Privacy policy | `https://shop.example.vn/pages/privacy` | Trang công khai |
| Data deletion instructions | `https://shop.example.vn/pages/data-deletion` | Trang công khai |

IPN cần đi thẳng tới API, không bị Basic Auth, CAPTCHA, trang đăng nhập hoặc redirect HTML chặn. Không yêu cầu cookie/X-Store-Request cho IPN: backend kiểm tra chữ ký riêng. Các thao tác từ frontend vẫn dùng cookie và header chống CSRF.

## 3. Google

1. Vào Google Cloud Console → Google Auth Platform, chọn/tạo project cho cửa hàng.
2. Cấu hình Branding: tên ứng dụng, email hỗ trợ, homepage, domain và privacy policy. Sửa trang riêng tư trong Quản trị theo thông tin cửa hàng trước khi gửi Google.
3. Cấu hình Audience. Với External ở trạng thái Testing, thêm email dùng thử vào Test users.
4. Trong Clients, tạo OAuth client loại **Web application**. Thêm Authorized redirect URI đúng URL Google ở bảng. Local có thể dùng `http://localhost:5173/api/auth/google/callback`; phải khớp scheme, host, port, path và dấu `/`.
5. Đặt `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` từ client vừa tạo trong môi trường API rồi restart. Luồng này không cần nhúng Google SDK ở frontend.
6. Mở Tài khoản → Đăng nhập Google, dùng test user đã thêm; kiểm tra hồ sơ, logout rồi đăng nhập lại phải trở về cùng tài khoản.
7. Trước khi mở cho khách, hoàn tất publishing/verification mà dashboard yêu cầu; Testing chưa phải phát hành công khai.

Backend dùng code flow, scope openid/email/profile, PKCE, state gắn trình duyệt và nonce. ID token được kiểm tra chữ ký RSA bằng khóa Google, issuer/audience/thời hạn/nonce; định danh là sub. Token nhà cung cấp không lưu trong database. Tham khảo [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server) và [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

Nếu email đã có tài khoản, hệ thống không tự gộp. Đăng nhập bằng phương thức cũ → Tài khoản → Liên kết Google/Facebook. Tài khoản chỉ dùng mạng xã hội không có mật khẩu nội bộ mặc định.

## 4. Facebook

1. Vào Meta for Developers, tạo/chọn app có use case Facebook Login cho người dùng website. Chọn luồng đăng nhập người dùng phù hợp; Facebook Login for Business là cấu hình khác, không thay thế tùy ý.
2. Điền website URL, app domains, email liên hệ, privacy policy và URL hướng dẫn xóa dữ liệu trong bảng. Sửa chính sách mẫu để phản ánh pháp nhân và quy trình thật.
3. Trong Facebook Login settings, bật luồng web OAuth, thêm **Valid OAuth Redirect URIs** chính xác. Nên dùng HTTPS public khi thử.
4. Lấy App ID, App Secret và phiên bản Graph API áp dụng cho app. Điền `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_GRAPH_VERSION` dạng vNN.0 với NN là số thực tế từ dashboard; không nhập nguyên vNN.0. Backend cố ý không tự chọn phiên bản.
5. Development mode: dùng admin/developer/tester đã chấp nhận lời mời. Restart API, thử nút Đăng nhập Facebook và kiểm tra tài khoản trả về.
6. Để khách thường sử dụng, hoàn tất Access/App Review/Business Verification mà dashboard yêu cầu và chuyển Live khi đủ điều kiện. Email có thể không được trả về dù đăng nhập thành công.

Backend yêu cầu public_profile/email, kiểm tra token thuộc đúng App ID, thời hạn, user ID và gửi appsecret_proof khi lấy profile. Nếu thiếu email, hệ thống dùng định danh nội bộ `@accounts.invalid`, không phải địa chỉ nhận thư. Liên kết tài khoản thực hiện sau đăng nhập như phần Google.

Trang data-deletion là **hướng dẫn tiếp nhận yêu cầu**, không phải endpoint signed_request tự động. Chọn tùy chọn URL hướng dẫn nếu dashboard cho phép, không nhập trang này vào ô callback tự động. Người vận hành cần thực hiện yêu cầu hỗ trợ/xóa theo chính sách đã công bố.

Tham khảo [Meta manual flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/) và [Meta login security](https://developers.facebook.com/docs/facebook-login/security/). Meta chặn truy xuất tự động tài liệu trong lần rà soát này; tên menu và yêu cầu xét duyệt cần đối chiếu trực tiếp dashboard của bạn.

## 5. VNPAY

1. Đăng ký [VNPAY sandbox](https://sandbox.vnpayment.vn/devreg/) hoặc liên hệ bộ phận tích hợp để nhận bộ merchant test.
2. Đặt TmnCode vào `VNPAY_TMN_CODE`, HashSecret vào `VNPAY_HASH_SECRET`; HashSecret không phải mật khẩu đăng nhập dashboard.
3. Đặt `PAYMENT_ENV=sandbox`, `PAYMENTS_LIVE_ENABLED=false`. Đăng ký IPN URL trong bảng với VNPAY. Backend gửi Return URL khi tạo giao dịch; đăng ký thêm nếu merchant yêu cầu.
4. Restart API, thêm hàng, chọn VNPAY ở checkout, đặt đơn rồi nhấn Thanh toán tại trang đơn. Backend tính tiền từ đơn đã lưu.
5. Dùng dữ liệu test VNPAY cung cấp, thử thành công và hủy. Không dùng thẻ thật ở sandbox. Kiểm tra IPN cập nhật đơn thay vì chỉ nhìn trang Return.
6. Nếu IPN chậm, nhấn Kiểm tra trạng thái để máy chủ gọi querydr. Nếu cần IP máy chủ, đặt `VNPAY_QUERY_IP` theo IP public đã thống nhất với VNPAY.
7. Production cần onboarding/hợp đồng và TmnCode/HashSecret production riêng. Thay khóa, domain HTTPS, đăng ký IPN production rồi đặt `PAYMENT_ENV=production`, `PAYMENTS_LIVE_ENABLED=true` sau nghiệm thu. Backend tự đổi endpoint.

Tích hợp dùng v2.1.0, HMAC-SHA512, VNĐ nhân100, thời gian GMT+7. Xác nhận thanh toán kiểm tra chữ ký, merchant, mã giao dịch, số tiền và trạng thái thành công. Tài liệu: [VNPAY thanh toán](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [VNPAY truy vấn](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).

## 6. MoMo

1. Đăng ký đối tác MoMo, yêu cầu bộ thông tin test cho thanh toán ví một lần/captureWallet.
2. Điền `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` thuộc cùng bộ sandbox. Đặt `PAYMENT_ENV=sandbox`.
3. Cung cấp domain/IPN nếu onboarding yêu cầu. Backend tự gửi redirectUrl/ipnUrl từ PUBLIC_ORIGIN khi tạo thanh toán.
4. Restart API, đặt đơn MoMo rồi nhấn Thanh toán. Backend gọi `https://test-payment.momo.vn/v2/gateway/api/create`. Dùng tài khoản/app MoMo test do đối tác hướng dẫn.
5. Thử thành công, hủy và quay về website trước IPN. IPN hợp lệ trả204; chữ ký/số tiền sai bị từ chối.
6. Nút Kiểm tra trạng thái truy vấn từ backend để đối soát khi IPN mất. Không tự tạo giao dịch khác nếu kết quả lần trước chưa rõ.
7. Khi được cấp quyền production, thay cả ba khóa, dùng domain thật rồi đặt `PAYMENT_ENV=production`, `PAYMENTS_LIVE_ENABLED=true`. Backend chuyển sang `https://payment.momo.vn`.

Hai cổng dùng chung PAYMENT_ENV: nếu bật cả hai thì cả hai bộ khóa phải cùng môi trường. MoMo dùng captureWallet, autoCapture=true và HMAC-SHA256. Tài liệu: [Tạo thanh toán](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [IPN](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/), [Truy vấn](https://developers.momo.vn/v3/vi/docs/payment/api/payment-api/query/).

## 7. Xử lý lỗi và đối soát

| Hiện tượng | Kiểm tra |
|---|---|
| Nút đăng nhập/cổng online không hiện | check-config, đủ biến API, restart; `/api/config` chỉ trả cờ, không trả secret. |
| redirect_uri_mismatch | So nguyên URL dashboard/PUBLIC_ORIGIN, không nhầm port5000 với5173. |
| State/OAuth hết hạn | Bắt đầu lại cùng hostname/trình duyệt, không sao chép callback hoặc mở nhiều luồng đăng nhập. |
| Facebook app không hoạt động | Vai trò tester/lời mời, Development/Live, quyền và Graph version. |
| Return thành công nhưng đơn còn chờ | Return không chứng minh trả tiền. Kiểm tra IPN qua proxy và dùng truy vấn trạng thái. |
| Chữ ký sai | Đúng bộ khóa/môi trường, không thừa khoảng trắng; proxy không sửa query/body. |
| Tạo thanh toán timeout | Giữ mã giao dịch, truy vấn hoặc nhờ hỗ trợ; không tạo thêm giao dịch ở merchant. |
| Tiền về sau hủy | Đơn vẫn hủy, tiền được đánh dấu cần hoàn; admin đối soát và hoàn trên merchant. |
| Đơn chờ giữ tồn kho | Khách/admin hủy để trả kho; hiện chưa có job tự hết hạn giữ hàng. |

Hủy đơn **không tự hoàn tiền**. Bản này chưa có API hoàn tiền tự động. COD chỉ đánh dấu đã trả khi admin chọn Ghi nhận đã thu COD sau giao hàng. Không đổi khóa sandbox/production trên database còn giao dịch chờ: dùng database test riêng và xử lý hết giao dịch cũ trước khi đổi môi trường.

## 8. Các chức năng cửa hàng và giới hạn

- Bộ lọc giá/danh mục/thương hiệu/công suất/Inverter, sắp xếp/tải thêm; lịch sử xem lưu tại trình duyệt.
- Đánh giá lưu máy chủ, chỉ khách có đơn đã giao được viết; mỗi khách một đánh giá/sản phẩm, cập nhật được. Sao và đã bán tính từ dữ liệu thực.
- Yêu cầu hỗ trợ riêng từng khách, admin trả lời trên website. Chưa gửi email phản hồi hay chạy chat AI.
- Nhận tin có đồng ý, admin xem danh sách, khách đăng nhập hủy cho email của mình. Đây là danh sách đăng ký; chưa tích hợp gửi mail/double opt-in/chiến dịch. Người không có tài khoản cần liên hệ để hủy. Trước khi gửi chiến dịch, bổ sung unsubscribe trong thư và xác minh quyền nhận tin.
- Admin sửa bài viết/chính sách/cửa hàng/đợt khuyến mãi, thêm sản phẩm, sửa giá/tồn kho và xem khách hàng. Khuyến mãi hiển thị giá catalog, không tự tạo coupon hay giảm thêm ở checkout.
- Trang cửa hàng trống khi chưa cấu hình, liên hệ bật qua CONTACT_PHONE/CONTACT_ZALO_URL/CONTACT_FACEBOOK_URL. Catalog và chính sách seed cần thay bằng thông tin thật trước vận hành.

## 9. Nghiệm thu

Chạy `node scripts/test-commerce.mjs`, `pnpm run typecheck`, `pnpm run build`. Test dùng SQLite tạm và OAuth/payment mô phỏng, không thu tiền thật và không chứng minh khóa merchant hoạt động. PostgreSQL, OAuth dashboard, IPN qua Internet và quyền Live cần kiểm thử riêng.

Kiểm tra thực tế: tài khoản không đọc được đơn/hỗ trợ của người khác; social ID đăng nhập lại đúng hồ sơ; liên kết email cũ đúng; mỗi cổng có đơn thành công/hủy; IPN lặp không ghi nhận hai lần; return giả không đánh dấu đã trả; truy vấn khôi phục khi IPN chậm; admin nhận diện cần hoàn tiền; đã thử sao lưu/khôi phục PostgreSQL.
