import { message } from "@/components/Message"
import { localDB } from "./localDB"
import mock, { code } from "./mock"

/**
 * 移除文本中的所有反斜杠和Markdown代码块标记
 * @param {string} text - 需要清理的文本
 * @returns {string} - 清理后的文本
 */
export function cleanText(text) {
  // 移除所有反斜杠
  let cleanedText = text.replace(/\\`/g, "`")
  cleanedText = cleanedText.replace(/\\$/g, "")

  // // 移除Markdown代码块标记
  // cleanedText = cleanedText.replace(/```[\w-]*\n[\s\S]*?\n```/g, function (match) {
  //   // 保留代码块内容，只移除``` 标记
  //   return match.replace(/```[\w-]*\n|```$/g, "")
  // })

  return cleanedText
}

/*
 * 将下划线命名转换为驼峰命名
 * @param {string} str - 需要转换的字符串
 * @returns {string} 转换后的驼峰命名字符串
 */
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const parserResult = (codeStr) => {
  const _codeStr = codeStr.replace("```json", "").replace("```js", "").replace("```javascript", "").replace("```", "")

  try {
    console.log(_codeStr)
    const getter = new Function(_codeStr)
    console.log(getter)
    const fun = getter()
    if (!fun) {
      return false
    }
    console.log(fun)
    const result = fun()
    return result
  } catch (error) {
    console.error(error)
    console.debug(_codeStr)
    return ""
  }
}

export function findNodeByPath(nodes, path) {
  for (let node of nodes) {
    if (path.includes(node.name)) {
      if (node.type === "file") {
        return node
      }
      if (node.type === "directory") {
        const result = findNodeByPath(node.children, path)
        if (result) {
          return result
        }
      }
    }
  }
  return null
}

export function searchFiles(paths, fileStructure) {
  const results = []

  function search(node, currentPath = "") {
    if (node.name) {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name

      if (paths.includes(fullPath)) {
        results.push(fullPath)
      }

      if (node.children) {
        node.children.forEach((child) => search(child, fullPath))
      }
    }
  }

  search(fileStructure)
  return results
}

export function processFilesContent(text) {
  let filesContent = []
  if (text.includes("//onlyForMoBegin")) {
    console.log(text)
    const regex = /\/\/onlyForMoBegin\s*([\s\S]*?)\s*\/\/onlyForMoEnd/g
    const matches = text.matchAll(regex)

    for (const match of matches) {
      if (match && match[1]) {
        try {
          const jsonContent = parserResult(match[1])
          console.log(jsonContent)
          if (jsonContent.files && Array.isArray(jsonContent.files)) {
            filesContent = filesContent.concat(jsonContent.files)
          }
        } catch (error) {
          console.log("解析失败的内容:", match[1])
          console.log("解析失败的完整内容:")
          console.error("解析 JSON 时出错:", error)
        }
      }
    }

    if (filesContent.length === 0) {
      console.log("在 ```javascript ``` 标签之间未找到 //only fo mo-2 的内容。")
    }

    console.log("处理后的文件内容:", filesContent)
  }
  return filesContent
}

export const updateSavedContext = async (newFileTree) => {
  const savedContext = localDB.getItem("savedContext")
  if (savedContext) {
    const updatedContext = savedContext.map((item) => {
      const node = findNodeByPath(newFileTree, item.path)
      return node && node.type === "file" ? { ...item, content: node.content || "" } : item
    })
    localDB.setItem("savedContext", updatedContext)
  }
}

export function convertFileStructure(fileStructure) {
  function traverse(node, currentPath = "") {
    if (node.type === "file") {
      return {
        path: currentPath + "/" + node.name,
        content: node.content || "",
      }
    } else if (node.type === "directory") {
      return node.children.flatMap((child) => traverse(child, currentPath + "/" + node.name))
    }
    return []
  }

  return fileStructure.flatMap((node) => traverse(node))
}

export function convertArrayToObject(array) {
  return array.reduce((acc, item) => {
    acc[item.path] = item.content
    return acc
  }, {})
}

export function blog(...args) {
  const styles = [
    "color: #ffffff",
    "background-color: #3498db",
    "padding: 2px 5px",
    "border-radius: 3px",
    "font-weight: bold",
    "font-family: Arial, sans-serif",
    "font-size: 12px",
    "text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3)",
  ].join(";")

  const timestamp = new Date().toLocaleTimeString()

  // 获取调用栈信息
  const stackTrace = {}
  Error.captureStackTrace(stackTrace, blog)
  const stackLines = stackTrace.stack.split("\n")
  const callerLine = stackLines[1] // 调用 blog 的那一行
  const match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/)
  const caller = match ? `${match[2]}:${match[3]}:${match[4]}` : "unknown location"

  const prefix = `%c[${timestamp}] (${caller})`

  // 提取参数名称
  const paramNames = callerLine.match(/blog\((.*?)\)/)
  const argNames = paramNames ? paramNames[1].split(",").map((name) => name.trim()) : []

  // 组合日志消息
  const logMessages = args.map((arg, index) => {
    const paramName = argNames[index] || `arg${index + 1}`
    return `${paramName}: ${JSON.stringify(arg)}`
  })

  console.log(prefix, styles, logMessages.join(" | "))
}

export const fetchController = { current: null }

/**
 * 封装 JSON stringify 的函数
 * @param {*} value - 要转换为 JSON 字符串的值
 * @param {(function(string, *): *|Array<string>)=} replacer - 可选的转换函数或要包含的属性数组
 * @param {(number|string)=} space - 可选的缩进空格数或字符串
 * @returns {string} JSON 字符串
 */
export function jsonStringify(value, replacer = null, space = 2) {
  if (value !== undefined) {
    // 如果值已经是字符串，直接返回
    if (typeof value === "string") {
      return value
    }
    // 否则，执行 JSON.stringify
    return JSON.stringify(value, replacer, space)
  } else {
    console.error("Value is undefined")
  }
}

/**
 * 解析 JSON 字符串
 * @param {*} text 要解析的文本
 * @returns {*} 解析后的对象或原始文本
 */
export function jsonParse(text) {
  // 如果输入是 undefined 或 null，直接返回
  if (text === undefined || text === null) {
    return text
  }

  // 如果输入不是字符串，直接返回
  if (typeof text !== "string") {
    return text
  }

  // 去除首尾空白
  text = text.trim()

  // 简单检查是否可能是 JSON 字符串
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return JSON.parse(text)
    } catch (error) {
      console.error("JSON 解析错误:", error)
      // 如果解析失败，返回原始文本
      return text
    }
  }

  // 如果不像是 JSON 字符串，直接返回原文本
  return text
}

export const memHandle = (chatHistory) => {
  // 将聊天记录转换为指定格式
  const formattedChats = chatHistory
    .map((chat) => {
      if (chat.role === "user") {
        return `\n我说:${chat.content[0].text}`
      }
      if (chat.role === "assistant") {
        return `\n你说:${chat.content}`
      }
      return null // 处理可能的其他角色
    })
    .filter((chat) => chat !== null) // 移除可能的 null 值

  // 只保留最新的 20 条记录
  const recentChats = formattedChats.slice(-20)

  // 将记录join成字符串，同时检查总字符数
  let memoryString = ""
  const MAX_CHARS = 20000 // 假设最大字符数为2000

  for (let i = recentChats.length - 1; i >= 0; i--) {
    const newMemory = recentChats[i] + (i > 0 ? ";" : "")
    if ((memoryString + newMemory).length <= MAX_CHARS) {
      memoryString = newMemory + memoryString
    } else {
      break // 如果添加下一条会超出字符限制，就停止
    }
  }

  return memoryString
}
