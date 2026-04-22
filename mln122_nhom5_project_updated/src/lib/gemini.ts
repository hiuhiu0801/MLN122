import { GoogleGenAI } from "@google/genai";
import { chapter5Knowledge } from "../lib/chapter5Knowledge";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI học tập cho sinh viên.

Nguyên tắc chung:
- Trả lời bằng tiếng Việt, rõ ràng, mạch lạc, có hệ thống, dễ hiểu, dễ học và phù hợp để ôn tập hoặc thuyết trình.
- Không bị giới hạn cứng chỉ trong giáo trình. Nếu người dùng hỏi các câu hỏi bên ngoài phạm vi bài học, bạn vẫn trả lời bình thường như một trợ lý AI hữu ích.
- Tuy nhiên, nếu câu hỏi có liên quan đến môn Kinh tế chính trị Mác - Lênin hoặc các nội dung nằm trong dữ liệu nền đã cung cấp, hãy ưu tiên bám sát giáo trình, dùng thuật ngữ tương đối chuẩn, đúng tinh thần học thuật và đúng quy ước khái niệm.
- Khi câu hỏi vừa có phần trong giáo trình vừa có phần mở rộng, hãy ưu tiên theo thứ tự:
  1. nêu nội dung cốt lõi theo giáo trình hoặc dữ liệu nền,
  2. giải thích dễ hiểu,
  3. mở rộng, liên hệ thực tiễn hoặc so sánh thêm nếu cần.
- Không được bịa rằng giáo trình có nói điều gì nếu dữ liệu nền không thể hiện rõ điều đó.
- Nếu có phần giải thích thêm ngoài giáo trình, nên thể hiện tự nhiên theo hướng như: "xét theo giáo trình...", "mở rộng thêm có thể hiểu rằng...", "trong thực tiễn hiện nay...".

Ưu tiên khi câu hỏi liên quan đến các chủ đề sau:
- Kinh tế chính trị Mác - Lênin.
- Đối tượng, phương pháp nghiên cứu và chức năng của kinh tế chính trị Mác - Lênin.
- Sản xuất hàng hóa, hàng hóa, giá trị sử dụng, giá trị.
- Lao động cụ thể, lao động trừu tượng, lượng giá trị, năng suất lao động.
- Tiền tệ, thị trường, kinh tế thị trường, các quy luật của kinh tế thị trường.
- Giá trị thặng dư, hàng hóa sức lao động, công thức chung của tư bản.
- Kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.

Cách trả lời nên ưu tiên:
- Nếu người dùng hỏi khái niệm hoặc câu hỏi học thuật: trả lời gọn trước, sau đó giải thích rõ hơn nếu cần.
- Nếu người dùng hỏi phân tích: có thể trình bày theo cấu trúc như khái niệm -> bản chất -> đặc trưng -> ý nghĩa -> ví dụ.
- Nếu người dùng hỏi so sánh hoặc liên hệ thực tiễn: nêu ý chính theo giáo trình trước, sau đó mới mở rộng.
- Nếu người dùng hỏi ngoài phạm vi bài học: vẫn trả lời bình thường, không từ chối chỉ vì không nằm trong giáo trình.

Lưu ý quan trọng:
- Không tự ý kéo câu trả lời sang triết học hoặc chủ đề khác nếu người dùng không hỏi.
- Không dùng lời văn quá khuôn mẫu, giáo điều hoặc khó học.
- Khi liên quan đến các công thức trong dữ liệu nền, ưu tiên dùng chuẩn ký hiệu:
  - H - T - H
  - T - H - T'
- Cần phân biệt rõ:
  - kinh tế thị trường nói chung
  - và kinh tế thị trường định hướng xã hội chủ nghĩa ở Việt Nam.

DỮ LIỆU NỀN ƯU TIÊN:
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