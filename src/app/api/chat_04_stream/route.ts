import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { toUIMessageStream } from "@ai-sdk/langchain";
import {
  createUIMessageStreamResponse,
  UIMessage,
  convertToModelMessages,
} from "ai";

// กำหนดให้ API นี้ทำงานแบบ Edge Runtime เพื่อประสิทธิภาพที่ดีกว่า
// export const runtime = "node"; // ใช้ Node.js runtime (ถ้าใช้ไลบรารีที่ไม่รองรับ Edge)
export const runtime = "edge";

// กำหนดเวลาสูงสุดที่ API จะทำงานได้ (เช่น 30 วินาที)
// ถ้าใช้เวลานานกว่านี้ จะถูกยกเลิก
export const maxDuration = 30; // วินาที

export async function POST(req: NextRequest) {
  try {
    // ดึงข้อความจาก request body ที่ส่งมาจาก useChat hook
    const { messages }: { messages: UIMessage[] } = await req.json();

    // สร้าง Prompt Template เพื่อกำหนดบทบาทและรูปแบบการตอบของ AI
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful and friendly AI assistant."],
      // แปลง UIMessage ให้เป็นรูปแบบที่ LangChain เข้าใจ
      ...convertToModelMessages(messages),
    ]);

    // เลือกรุ่นของโมเดล OpenAI ที่ต้องการใช้
    const model = new ChatOpenAI({
        model: process.env.OPENAI_MODEL_NAME || "gpt-4o-mini",
        temperature: 0.7, // ความสร้างสรรค์ของคำตอบ (0 = เป็นระบบมาก, 1 = สร้างสรรค์มาก)
        maxTokens: 300, // จำนวน token สูงสุดที่สามารถตอบได้
        streaming: true, // เปิดใช้ streaming response ค่า default = false // Opensource บางตัวไม่รองรับ streaming
    })

   // Ollama (Local) =================================================================================
  // สร้าง instance ของ Ollama (Local) - ใช้ ChatOpenAI กับ baseURL ของ Ollama
  // const model = new ChatOpenAI({
  //     // model: process.env.OLLAMA_MODEL_NAME || "gpt-oss:20b", // ชื่อโมเดลที่ต้องการใช้
  //     model: process.env.OLLAMA_MODEL_NAME || "gemma3:4b", // ชื่อโมเดลที่ต้องการใช้
  //     temperature: 0.7,
  //     maxTokens: 1000,
  //     configuration: {
  //         baseURL: process.env.OLLAMA_API_BASE || "http://localhost:11434/v1", // URL ของ Ollama API
  //     },
  //     apiKey: "ollama", // Ollama ไม่ต้องการ API key จริง แต่ต้องใส่ค่าอะไรก็ได้
  // })

    // สร้าง Chain โดยการเชื่อมต่อ Prompt กับ Model เข้าด้วยกัน
    const chain = prompt.pipe(model);

    // เรียกใช้งาน Chain พร้อมกับส่ง message ล่าสุดไป และรับผลลัพธ์แบบ stream
    const stream = await chain.stream({
      // LangChain ต้องการตัวแปรเปล่าๆ ใน input สำหรับ prompt ที่สร้างจาก message history
    });

    // ส่ง Response กลับไปให้ Frontend
    const response = createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
    });

    return response;
  } catch (error) {
    // จัดการ error และ log รายละเอียดเพื่อ debug
    console.error("API Error:", error);
    // ส่ง error response กลับไปยัง client
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
      }),
      {
        status: 500, // HTTP status code สำหรับ Internal Server Error
        headers: { "Content-Type": "application/json" }, // กำหนด content type เป็น JSON
      }
    );
  }
}
