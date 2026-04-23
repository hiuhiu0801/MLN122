import OpenAI from "openai";
import { chapter5Knowledge } from "../lib/chapter5Knowledge";

const apiKey = import.meta.env.VITE_LLM_API_KEY;
const baseURL =
  import.meta.env.VITE_LLM_BASE_URL || "https://api.openai.com/v1";
const model = import.meta.env.VITE_LLM_MODEL || "gpt-5.4-mini";

const ai = apiKey
  ? new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true,
    })
  : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI học tập cho sinh viên, ưu tiên hỗ trợ môn Kinh tế chính trị Mác - Lênin.

Nguyên tắc trả lời:
- Luôn trả lời bằng tiếng Việt.
- Trả lời ngắn gọn, đi thẳng vào câu hỏi, không lan man.
- Chỉ giải thích thêm, mở rộng, cho ví dụ hoặc liên hệ khi người dùng yêu cầu.
- Không mở bài dài, không nhắc lại ý cũ nhiều lần.

Ưu tiên theo ngữ cảnh:
- Nếu câu hỏi liên quan đến Kinh tế chính trị Mác - Lênin hoặc dữ liệu nền đã cung cấp, phải ưu tiên bám sát dữ liệu nền và dùng thuật ngữ tương đối chuẩn.
- Nếu câu hỏi nằm ngoài dữ liệu nền nhưng vẫn liên quan môn học, vẫn có thể trả lời, nhưng phải nói rõ đó là phần mở rộng ngoài dữ liệu nền.
- Nếu câu hỏi hoàn toàn ngoài phạm vi môn học, vẫn trả lời bình thường như một trợ lý AI hữu ích.

Quy tắc rất quan trọng:
- Không được bịa rằng dữ liệu nền hoặc giáo trình có nói điều gì nếu dữ liệu nền không thể hiện rõ.
- Nếu người dùng hỏi mốc thời gian, văn kiện, kỳ Đại hội, số liệu, hay chi tiết học thuật cụ thể mà dữ liệu nền không nêu rõ, phải nói rõ:
  "Trong dữ liệu nền hiện có, phần này chưa được nêu cụ thể."
  Sau đó mới được trả lời phần mở rộng ngoài dữ liệu nền nếu bạn biết.
- Khi trả lời phần ngoài dữ liệu nền, phải báo rõ bằng các cách tự nhiên như:
  "xét ngoài dữ liệu nền...",
  "theo tri thức phổ biến...",
  "nếu mở rộng ngoài giáo trình..."
- Không được trình bày phần mở rộng ngoài dữ liệu nền như thể đó là nội dung chắc chắn có sẵn trong giáo trình.

Cách trả lời:
- Với câu hỏi khái niệm: trả lời ngắn, đúng ý chính trước.
- Với câu hỏi phân tích: chỉ nêu các ý cần thiết để trả lời đúng câu hỏi.
- Với câu hỏi hỏi mốc cụ thể: ưu tiên xác nhận dữ liệu nền có nêu hay không trước, rồi mới trả lời.
- Nếu câu hỏi có nguy cơ gây nhầm giữa nhiều mốc thời gian hoặc nhiều cách diễn đạt, hãy phân biệt thật rõ từng mốc, không gộp mơ hồ.

Lưu ý:
- Không tự kéo sang triết học hoặc chủ đề khác nếu người dùng không hỏi.
- Không dùng lời văn quá khuôn mẫu, giáo điều hoặc quá dài.
- Khi liên quan đến công thức, dùng đúng ký hiệu:
  - H - T - H
  - T - H - T'
- Phân biệt rõ:
  - kinh tế thị trường nói chung
  - kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam

Dữ liệu nền ưu tiên:
${chapter5Knowledge}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? "Đã có lỗi xảy ra khi kết nối mô hình AI.");
  }
}

function isRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("too many requests")
  );
}

function isApiKeyError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("api key") ||
    normalized.includes("incorrect api key") ||
    normalized.includes("invalid api key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("permission denied") ||
    normalized.includes("forbidden") ||
    normalized.includes("403") ||
    normalized.includes("401")
  );
}

function isServerBusyError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("overloaded") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("bad gateway") ||
    normalized.includes("502") ||
    normalized.includes("gateway timeout") ||
    normalized.includes("504")
  );
}

function isNotFoundError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("404") || normalized.includes("not found");
}

function normalizeHistory(history: ChatHistoryItem[]) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const content = Array.isArray(item.parts)
        ? item.parts.map((part) => part?.text || "").filter(Boolean).join("\n")
        : "";

      if (!content.trim()) return null;

      return {
        role: item.role === "model" ? "assistant" : "user",
        content,
      };
    })
    .filter(Boolean) as { role: "user" | "assistant"; content: string }[];
}

export const getChatResponse = async (
  message: string,
  history: ChatHistoryItem[]
): Promise<string> => {
  if (!ai) {
    return "Chưa cấu hình VITE_LLM_API_KEY trong file .env.local nên chatbot AI chưa hoạt động.";
  }

  const historyMessages = normalizeHistory(history);

  const cleanedHistory =
    historyMessages.length > 0 &&
    historyMessages[historyMessages.length - 1].role === "user" &&
    historyMessages[historyMessages.length - 1].content.trim() === message.trim()
      ? historyMessages.slice(0, -1)
      : historyMessages;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: SYSTEM_INSTRUCTION,
          },
          ...cleanedHistory,
          {
            role: "user",
            content: message,
          },
        ] as any,
        temperature: 0.2,
      });

      const text = response.choices?.[0]?.message?.content?.trim();

      if (text) return text;

      return "Tôi chưa tạo được phản hồi từ AI. Hãy thử lại.";
    } catch (error) {
      lastError = error;
      const rawMessage = getErrorMessage(error);

      console.error(`Error calling chat API (attempt: ${attempt + 1}):`, error);

      if (isApiKeyError(rawMessage)) {
        return "API key hiện không dùng được hoặc không hợp lệ. Hãy kiểm tra lại VITE_LLM_API_KEY.";
      }

      if (isNotFoundError(rawMessage)) {
        return "Không tìm thấy model chat hiện tại. Hãy kiểm tra lại VITE_LLM_MODEL.";
      }

      if (isRateLimitError(rawMessage) || isServerBusyError(rawMessage)) {
        if (attempt < 2) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        break;
      }

      return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
    }
  }

  const finalMessage = getErrorMessage(lastError);

  if (isRateLimitError(finalMessage) || isServerBusyError(finalMessage)) {
    return "Hệ thống AI đang quá tải tạm thời. Bạn thử lại sau vài giây.";
  }

  if (isApiKeyError(finalMessage)) {
    return "API key hiện không dùng được hoặc không hợp lệ. Hãy kiểm tra lại VITE_LLM_API_KEY.";
  }

  if (isNotFoundError(finalMessage)) {
    return "Không tìm thấy model chat hiện tại. Hãy kiểm tra lại VITE_LLM_MODEL.";
  }

  return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
};

export const generateImage = async (_prompt: string): Promise<string | null> => {
  return null;
};