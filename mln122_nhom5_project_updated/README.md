# Triết học biện chứng - bản test local đã chỉnh

## Chạy local

```bash
npm install
npm run dev
```

Mặc định app chạy ở:

```text
http://localhost:3000
```

## Lưu ý

- Bản zip này đã có sẵn `.env.local` để test local nhanh.
- Nếu muốn dùng key khác, sửa `.env.local` hoặc copy từ `.env.example`.
- Muốn đăng nhập Google ở local, trong Firebase Console cần bật `Google`, `Email/Password` và thêm `localhost` vào `Authorized domains`.
- Nếu chatbot không trả lời, kiểm tra lại Gemini API key.
