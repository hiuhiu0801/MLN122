import { GoogleGenAI } from "@google/genai";
import { chapter5Knowledge } from "../lib/chapter5Knowledge";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const SYSTEM_INSTRUCTION = `Bạn là trợ lý học tập cho môn Kinh tế chính trị Mác - Lênin.
Bạn đang hỗ trợ người dùng chuẩn bị thuyết trình Nhóm 5 với chủ đề "Kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam".

Yêu cầu bắt buộc:
- Chỉ ưu tiên trả lời theo dữ liệu đã được cấu hình bên dưới.
- Không nhắc sang phép biện chứng duy vật, ba quy luật, hay các nội dung triết học không liên quan.
- Khi phù hợp, hãy trình bày theo bố cục: khái niệm, tính tất yếu, đặc trưng, thể chế, liên hệ thực tiễn.
- Có thể diễn đạt học thuật nhưng phải dễ hiểu, phục vụ học và thuyết trình.
- Nếu câu hỏi nằm ngoài phạm vi kiến thức đã cấu hình, hãy nói rõ giới hạn đó.

DỮ LIỆU NỀN:
${chapter5Knowledge}`;

const CHAT_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "Đã có lỗi xảy ra khi kết nối Gemini.");
}

function isHighDemandError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("unavailable") ||
    normalized.includes("high demand")
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

export const getChatResponse = async (
  message: string,
  history: ChatHistoryItem[]
): Promise<string> => {
  if (!ai) {
    return "Chưa cấu hình VITE_GEMINI_API_KEY trong file .env.local nên chatbot AI chưa hoạt động.";
  }

  let lastError: unknown = null;

  for (const model of CHAT_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [...history, { role: "user", parts: [{ text: message }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.6,
          },
        });

        const text = response.text?.trim();
        if (text) return text;
        return "Tôi chưa tạo được phản hồi từ Gemini. Hãy thử lại.";
      } catch (error) {
        lastError = error;
        const rawMessage = getErrorMessage(error);
        console.error(
          `Error calling Gemini API (model: ${model}, attempt: ${attempt + 1}):`,
          error
        );

        if (isApiKeyError(rawMessage)) {
          return "Gemini API key hiện không dùng được. Bạn cần thay bằng key mới còn hoạt động trong file .env.local.";
        }

        if (isHighDemandError(rawMessage)) {
          if (attempt < 2) {
            await sleep(1200 * (attempt + 1));
            continue;
          }
          break;
        }

        return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
      }
    }
  }

  const finalMessage = getErrorMessage(lastError);
  if (isHighDemandError(finalMessage)) {
    return "Hệ thống AI đang quá tải tạm thời. Bạn thử lại sau vài giây.";
  }
  if (isApiKeyError(finalMessage)) {
    return "Gemini API key hiện không dùng được. Bạn cần thay bằng key mới còn hoạt động trong file .env.local.";
  }
  return "Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo.";
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};
