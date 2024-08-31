import { message } from "@/components/Message"
import { blog, fetchController, jsonParse, jsonStringify } from "@/utils"
import { localDB } from "@/utils/localDB"
import { events } from "fetch-event-stream"

export default async function chatMoV2(messages, onChunk, onCancel, isFirst = true, temperature = 0, overFlag = "YES") {
  // const wsPort = (await (window as any).electronAPI?.env?.getWsPort()) || 3000
  const apiKey = localStorage.getItem("mobenai.api-key")
  const apiEndPoint = `https://open.bigmodel.cn/api/paas/v4/chat/completions`
  const payload = {
    model: "glm-4-flash",
    messages: messages.map((msg) => {
      if (msg.role === "system" || msg.role === "assistant") {
        return {
          role: msg.role,
          content: msg.content,
        }
      }
      // 修改这里以正确处理 user 消息的 content
      return {
        role: msg.role,
        content: Array.isArray(msg.content) ? msg.content[0].text : msg.content,
      }
    }),
    temperature,
    max_tokens: 4096,
    stream: true,
  }

  let controller = new AbortController()
  fetchController.current = controller
  onCancel(() => controller.abort())

  try {
    const response = await fetch(apiEndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: jsonStringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}. ${errorText}`)
    }

    const eventStream = events(response, controller.signal)
    let fullContent = ""

    for await (let event of eventStream) {
      if (event.data !== "[DONE]") {
        try {
          const parsed = jsonParse(event.data)
          const content = parsed?.choices[0]?.delta?.content || ""
          fullContent += content
          onChunk(content)

          // 检查停止原因
          if (parsed?.choices[0]?.finish_reason === "length") {
            // 如果停止原因是 length，则继续调用
            const lastTenChars = fullContent.slice(-10)
            await chatMoV2(
              messages.concat([
                {
                  role: "assistant",
                  content: fullContent,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `从"""${lastTenChars}"""后面开始继续生成，开头和结尾都不要解释和说明，也不要有\`\`\`json 和这样的标记`,
                    },
                  ],
                },
              ]),
              onChunk,
              onCancel
            )
            return // 结束当前调用
          }
        } catch (error) {
          console.error("Error parsing JSON:", error)
        }
      } else {
        localDB.setItem("chat-chunk-over", overFlag)
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Fetch aborted")
    } else {
      console.error("Error:", error)
      message.error(`An error occurred while fetching data: ${error.message}`)
      if (error.message.includes("context_length_exceeded")) {
        onChunk(`项目大小超过了最大上下文，无法使用自动检索模式，请切换到手动检索模式，手动勾选需要修改的文件`)
      }
    }
    throw error
  }
}
