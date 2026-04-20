import { GoogleGenAI } from "@google/genai";
import { chapter5Knowledge } from "../lib/chapter5Knowledge";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const SYSTEM_INSTRUCTION = `Bạn là trợ lý học tập AI cho sinh viên.
Nếu câu hỏi liên quan đến bài học "Kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam", hãy ưu tiên trả lời bám sát giáo trình và dữ liệu nền được cung cấp.
Nếu câu hỏi không thuộc bài học này, bạn vẫn trả lời bình thường như một trợ lý AI hữu ích, rõ ràng, dễ hiểu.

Nguyên tắc trả lời:
- Với câu hỏi liên quan bài học, ưu tiên dùng đúng thuật ngữ, nội dung và tinh thần của giáo trình.
- Có thể trả lời các câu hỏi mở rộng liên quan đến học tập, ôn tập, thuyết trình, cách hiểu bài.
- Nếu người dùng hỏi khái niệm tổng quát liên quan, hãy trả lời khái quát trước rồi liên hệ với nội dung bài học khi phù hợp.
- Không tự ý kéo câu trả lời sang các nội dung triết học không liên quan nếu người dùng không hỏi.
- Trả lời bằng tiếng Việt, rõ ràng, có hệ thống, dễ học.

DỮ LIỆU NỀN CỦA BÀI HỌC:
${chapter5Knowledge}`;

const CHAT_MODELS = [ "gemini-2.0-flash"];

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
  _message: string,
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
          contents: history,
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