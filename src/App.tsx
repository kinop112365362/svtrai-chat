import { useState, useEffect, useRef } from "react"
import reactLogo from "./assets/react.svg"
import viteLogo from "/vite.svg"
import "./App.css"
import chatZhipuai from "./sefvice/chat-zhipuai"

function App() {
  const [count, setCount] = useState(0)
  const wrapper = useRef<any>()

  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.src = src
        script.onload = () => {
          console.log(`Script loaded from ${src}`)
          resolve()
        }
        script.onerror = (e) => {
          console.error(`Error loading script from ${src}`, e)
          reject(e)
        }
        document.body.appendChild(script)
      })
    }

    Promise.all([
      loadScript("https://g.alicdn.com/code/npm/@ali/chatui-sdk/6.3.0/ChatSDK.js"),
      loadScript("https://g.alicdn.com/code/npm/@ali/chatui-sdk/6.3.0/isvParser.js"),
      loadScript("https://g.alicdn.com/chatui/icons/2.0.2/index.js"),
    ])
      .then((res) => {
        console.log(res)
        const bot = new ChatSDK({
          root: wrapper.current,
          config: {
            navbar: { title: "SVTRAI 咨询顾问" },
            robot: { avatar: "//gw.alicdn.com/tfs/TB1U7FBiAT2gK0jSZPcXXcKkpXa-108-108.jpg" },
            messages: [{ code: "text", data: { text: "SVTRAI 咨询顾问为您服务，请问有什么可以帮您？" } }],
          },
          requests: {
            send: async function (msg) {
              if (msg.type === "text" || msg.code === "text") {
                let messageId = null
                let fullContent = ""
                try {
                  const response = await chatZhipuai(
                    [{ role: "user", content: msg.data.text }],
                    (chunk) => {
                      console.log("Response from chatZhipuai:", chunk)
                      if (messageId) {
                        fullContent += chunk
                        bot.updateMessage(messageId, {
                          code: "text",
                          data: { text: fullContent },
                          position: "left",
                        })
                      } else {
                        messageId = Math.random()
                        fullContent += chunk
                        bot.appendMessage({
                          id: messageId,
                          code: "text",
                          data: { text: fullContent },
                          position: "left",
                        })
                      }
                    },
                    () => {},
                    true,
                    0,
                    "YES"
                  )
                  console.log("Response from chatZhipuai:", response)
                } catch (error) {
                  console.error("Error sending message:", error)
                }
              }
            },
          },
          handlers: {
            // parseResponse: function (res, requestType) {
            //   if (requestType === "send" && res.MessageId) {
            //     // 解析 ISV 消息数据
            //     return isvParser({ data: res })
            //   }
            //   return res
            // },
          },
        })

        bot.run()
      })
      .catch((e) => {
        console.error("Error loading scripts", e)
      })
  }, [])

  return (
    <>
      <div ref={wrapper}></div>
    </>
  )
}

export default App
