import { NextRequest, NextResponse } from "next/server"
import { ChatOpenAI } from "@langchain/openai"

export async function POST(req: NextRequest) {

    // Example Payload
    //   {
    //     "message": [
    //         {
    //             "role": "system",
    //             "content": "คุณเป็นจัดการฝ่ายการเงินของบริษัท คุณตอบคำถามให้พนักงานในบริษัทในเรื่องการเงิน"
    //         },
    //         {
    //             "role": "user",
    //             "content": "สวัสดีครับ ปกติบริษัทเราแบ่งงบการตลาดเป็นกี่เปอร์เซ็นต์ครับ"
    //         }
    //     ]
    //   }

    // สร้างตัวแปรรับข้อมูลจาก client
    const body = await req.json()

    // ดึงข้อความจาก body 
    const message: [] = body.message ?? []

    // สร้าง instance ของ ChatOpenAI (Model ChatGPT)
    const model = new ChatOpenAI({
      model: process.env.OPENAI_MODEL_NAME || "gpt-4o-mini",
      temperature: 0.7, // ความสร้างสรรค์ของคำตอบ มีระดับ 0-1 // 0 คือ ตอบตรง ๆ // 1 คือ ตอบแบบสร้างสรรค์
      maxTokens: 300, // จำนวนคำตอบสูงสุดที่ต้องการ 300 token
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

    // try...catch เช็ค error 
    try {
        const response = await model.invoke(message)

        // ดึงชื่อโมเดลจริงจาก metadata (บาง provider ใส่ model หรือ model_name)
        const meta = response.response_metadata || {}
        const usedModel = meta.model || meta.model_name || "unknown"

        // ส่งกลับทั้งคำตอบและชื่อโมเดล (จะได้เห็นชัดว่า “ตอบจากโมเดลอะไร”)
        return NextResponse.json({
            content: response.content,
            usedModel,
        })

    } catch (error) {
        // Handle error
        console.error("Error:", error)
        return NextResponse.json({ error: "An error occurred" })
    }

}