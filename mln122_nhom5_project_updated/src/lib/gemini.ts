import { GoogleGenAI } from "@google/genai";
import { chapter5Knowledge } from "../lib/chapter5Knowledge";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI học tập cho sinh viên.

Nguyên tắc trả lời:
- Luôn trả lời bằng tiếng Việt.
- Ưu tiên trả lời ngắn gọn, đúng thẳng vào câu hỏi.
- Không tự mở rộng dài dòng.
- Chỉ giải thích thêm, phân tích sâu, cho ví dụ, liên hệ thực tiễn hoặc so sánh khi người dùng yêu cầu rõ.
- Không nói lan man, không nhắc lại quá nhiều, không mở bài dài.

Ưu tiên theo ngữ cảnh:
- Nếu câu hỏi liên quan đến Kinh tế chính trị Mác - Lênin hoặc dữ liệu nền đã cung cấp, hãy ưu tiên bám sát giáo trình, dùng thuật ngữ tương đối chuẩn, đúng tinh thần học thuật.
- Nếu câu hỏi nằm ngoài phạm vi bài học, vẫn trả lời bình thường như một trợ lý AI hữu ích.

Cách trả lời:
- Với câu hỏi khái niệm: trả lời ngắn, nêu đúng ý chính trước.
- Với câu hỏi phân tích: chỉ trình bày các ý thật cần thiết để trả lời đúng câu hỏi.
- Với câu hỏi so sánh hoặc liên hệ: nêu ý chính trước, chỉ mở rộng khi người dùng muốn.
- Nếu chưa đủ dữ liệu để khẳng định điều gì thuộc giáo trình, không được bịa.

Lưu ý:
- Không tự kéo sang triết học hoặc chủ đề khác nếu người dùng không hỏi.
- Không dùng lời văn quá khuôn mẫu, giáo điều hoặc quá dài.
- Khi liên quan đến công thức, dùng đúng ký hiệu:
  - H - T - H
  - T - H - T'
- Phân biệt rõ kinh tế thị trường nói chung và kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.

Dữ liệu nền ưu tiên:
${chapter5Knowledge}`;

const CHAT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const IMAGE_MODEL = "gemini-2.5-flash-image";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? "Đã có lỗi xảy ra khi kết nối Gemini.");
  }
}

function isHighDemandError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("unavailable") ||
    normalized.includes("high demand") ||
    normalized.includes("overloaded")
  );
}

function isRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("resource exhausted")
  );
}

function isApiKeyError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("api key") ||
    normalized.includes("permission") ||
    normalized.includes("unauthorized") ||
    normalized.includes("leaked") ||
    normalized.includes("permission denied") ||
    normalized.includes("403")
  );
}

function isNotFoundModelError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("not supported for generatecontent") ||
    normalized.includes("model") && normalized.includes("not found")
  );
}

function normalizeChatContents(
  message: string,
  history: ChatHistoryItem[]
): string | ChatHistoryItem[] {
  if (Array.isArray(history) && history.length > 0) {
    return history;
  }
  return message;
}

export const getChatResponse = async (
  message: string,
  history: ChatHistoryItem[]
): Promise<string> => {
  if (!ai) {
    return "Chưa cấu hình VITE_GEMINI_API_KEY trong file .env.local nên chatbot AI chưa hoạt động.";
  }

  const contents = normalizeChatContents(message, history);
  let lastError: unknown = null;

  for (const model of CHAT_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.6,
          },
        });

        const text = response.text?.trim();
        if (text) return text;

        const fallbackText =
          response.candidates?.[0]?.content?.parts
            ?.map((part: any) => part?.text)
            .filter(Boolean)
            .join("\n")
            .trim() || "";

        if (fallbackText) return fallbackText;

        return "Tôi chưa tạo được phản hồi từ AI. Hãy thử lại.";
      } catch (error) {
        lastError = error;
        const rawMessage = getErrorMessage(error);

        console.error(
          `Error calling Gemini API (model: ${model}, attempt: ${attempt + 1}):`,
          error
        );

        if (isApiKeyError(rawMessage)) {
          return "Gemini API key hiện không dùng được. Bạn cần thay key mới còn hoạt động trong file .env.local.";
        }

        if (isNotFoundModelError(rawMessage)) {
          // Model hiện tại không hợp lệ -> bỏ qua model này và thử model tiếp theo
          break;
        }

        if (isHighDemandError(rawMessage) || isRateLimitError(rawMessage)) {
          if (attempt < 2) {
            await sleep(1200 * (attempt + 1));
            continue;
          }
          // Hết số lần thử với model hiện tại -> chuyển sang model fallback
          break;
        }

        return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
      }
    }
  }

  const finalMessage = getErrorMessage(lastError);

  if (isHighDemandError(finalMessage) || isRateLimitError(finalMessage)) {
    return "Hệ thống AI đang quá tải tạm thời. Bạn thử lại sau vài giây.";
  }

  if (isApiKeyError(finalMessage)) {
    return "Gemini API key hiện không dùng được. Bạn cần thay key mới còn hoạt động trong file .env.local.";
  }

  return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!ai) {
    console.error("Chưa cấu hình VITE_GEMINI_API_KEY.");
    return null;
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: prompt,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];

      for (const part of parts as any[]) {
        if (part?.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }

      const textFallback = parts
        .map((part: any) => part?.text)
        .filter(Boolean)
        .join("\n")
        .trim();

      console.error(
        "Gemini không trả về dữ liệu ảnh. Response text:",
        textFallback || "(không có text)"
      );
      console.error("Full image response:", response);

      return null;
    } catch (error) {
      lastError = error;
      const rawMessage = getErrorMessage(error);

      console.error(
        `Error generating image (attempt: ${attempt + 1}):`,
        error
      );

      if (isApiKeyError(rawMessage)) {
        return null;
      }

      if (isNotFoundModelError(rawMessage)) {
        console.error(
          `Model ${IMAGE_MODEL} không tồn tại hoặc không được hỗ trợ trong môi trường hiện tại.`
        );
        return null;
      }

      if (isHighDemandError(rawMessage) || isRateLimitError(rawMessage)) {
        if (attempt < 1) {
          await sleep(1500);
          continue;
        }
        return null;
      }

      return null;
    }
  }

  console.error("Image generation failed:", lastError);
  return null;
};