import { message } from "@/components/Message"
import { blog, jsonParse, jsonStringify } from "."
import EventEmitter from "eventemitter3"

let currentAppId = localStorage.getItem("@@appId")
if (!currentAppId) {
  message.error("本地存储的 appId 未设置")
}

const events = {}

const middlewares = {
  get: [],
  set: [],
}

const businessPipelines = {
  get: {},
  set: {},
}

// 添加日志开关
let isLoggingEnabled = false

// 添加日志样式
const logStyles = {
  info: "color: #3498db; font-weight: bold;",
  success: "color: #2ecc71; font-weight: bold;",
  warning: "color: #f39c12; font-weight: bold;",
  error: "color: #e74c3c; font-weight: bold;",
}

// 创建 EventEmitter 实例
const eventEmitter = new EventEmitter()

export const localDB = {
  setAppId: (appId) => {
    currentAppId = appId
    localStorage.setItem("@@appId", appId)
  },

  getAppId: () => {
    return currentAppId || localStorage.getItem("@@appId")
  },

  // 添加控制日志输出的方法
  enableLogging: (enable) => {
    isLoggingEnabled = enable
  },

  // 封装日志输出方法
  log: (level, ...args) => {
    if (isLoggingEnabled) {
      const style = logStyles[level] || ""
      console.log(`%c[LocalDB ${level.toUpperCase()}]`, style, ...args)
    }
  },

  addMiddleware: (type, middleware) => {
    if (type !== "get" && type !== "set") {
      throw new Error('Middleware type must be either "get" or "set"')
    }
    middlewares[type].push(middleware)
  },

  removeMiddleware: (type, middleware) => {
    if (type !== "get" && type !== "set") {
      throw new Error('Middleware type must be either "get" or "set"')
    }
    const index = middlewares[type].indexOf(middleware)
    if (index > -1) {
      middlewares[type].splice(index, 1)
    }
  },

  addBusinessPipeline: (type, key, pipeline) => {
    if (type !== "get" && type !== "set") {
      throw new Error('Pipeline type must be either "get" or "set"')
    }
    businessPipelines[type][key] = pipeline
  },

  removeBusinessPipeline: (type, key) => {
    if (type !== "get" && type !== "set") {
      throw new Error('Pipeline type must be either "get" or "set"')
    }
    delete businessPipelines[type][key]
  },

  setItem: (key, value) => {
    const fullKey = currentAppId ? `${currentAppId}:${key}` : key
    try {
      const businessPipeline = businessPipelines.set[key] || ((value) => value)

      const middlewareChain = (index) => {
        if (index < middlewares.set.length) {
          return (key, value) =>
            middlewares.set[index](key, value, (newKey, newValue) => middlewareChain(index + 1)(newKey, newValue))
        } else {
          return (key, value) => {
            localStorage.setItem(key, jsonStringify(value))
            localDB.notifyChange(key, value)
          }
        }
      }
      const processedValue = businessPipeline(value)
      middlewareChain(0)(fullKey, processedValue)
      localDB.log("success", `成功设置值: ${key}`)
    } catch (error) {
      localDB.log("error", `设置值失败: ${key}`, error)
      message.error(`设置值失败: ${key}`)
      throw error
    }
  },

  getItem: (key) => {
    const fullKey = currentAppId ? `${currentAppId}:${key}` : key
    try {
      localDB.log("info", `尝试获取值: ${fullKey}`)
      let rawValue = localStorage.getItem(fullKey)
      localDB.log("info", `从 localStorage 获取的原始值:`, rawValue)

      if (rawValue === null) {
        localDB.log("warning", `未找到值: ${fullKey}`)
        return null
      }

      let parsedValue
      try {
        parsedValue = jsonParse(rawValue)
        localDB.log("success", `解析值:`, parsedValue)
      } catch (parseError) {
        localDB.log("warning", `解析值失败:`, parseError)
        return rawValue // 如果解析失败，返回原始字符串
      }

      const businessPipeline = businessPipelines.get[key] || ((value) => value)
      const processedValue = businessPipeline(parsedValue)
      localDB.log("info", `处理后的值:`, processedValue)

      const middlewareChain = (index) => {
        if (index < middlewares.get.length) {
          return (key) => middlewares.get[index](key, (newKey) => middlewareChain(index + 1)(newKey))
        } else {
          return (key) => processedValue
        }
      }

      return middlewareChain(0)(fullKey)
    } catch (error) {
      localDB.log("error", `获取值失败: ${key}`, error)
      message.error("获取数据失败")
      return null
    }
  },

  removeItem: (key) => {
    const fullKey = currentAppId ? `${currentAppId}:${key}` : key
    try {
      localStorage.removeItem(fullKey)
      localDB.notifyChange(fullKey, null)
      localDB.log("success", `成功移除值: ${key}`)
    } catch (error) {
      localDB.log("error", `移除值失败: ${key}`, error)
      message.error("删除数据失败")
    }
  },

  clear: () => {
    try {
      if (currentAppId) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key.startsWith(`${currentAppId}:`)) {
            localStorage.removeItem(key)
          }
        }
      } else {
        localStorage.clear()
      }
      localDB.notifyChange(null, null)
      localDB.log("success", "成功清空存储")
    } catch (error) {
      localDB.log("error", "清空存储失败", error)
      message.error("清空存储失败")
    }
  },

  key: (index) => {
    try {
      const keys = Object.keys(localStorage).filter((key) => !currentAppId || key.startsWith(`${currentAppId}:`))
      if (index >= 0 && index < keys.length) {
        const fullKey = keys[index]
        return currentAppId ? fullKey.substring(currentAppId.length + 1) : fullKey
      }
      return null
    } catch (error) {
      localDB.log("error", "获取键名失败", error)
      message.error("获取键名失败")
      return null
    }
  },

  length: () => {
    try {
      return Object.keys(localStorage).filter((key) => !currentAppId || key.startsWith(`${currentAppId}:`)).length
    } catch (error) {
      localDB.log("error", "获取数据长度失败", error)
      message.error("获取数据长度失败")
      return 0
    }
  },

  notifyChange: (key, value) => {
    console.log(key)
    eventEmitter.emit(key, { key, value })
  },

  watchKey: (key, callback) => {
    const fullKey = currentAppId ? `${currentAppId}:${key}` : key
    const handle = (args) => {
      callback(args)
    }
    console.log(fullKey)
    eventEmitter.on(fullKey, handle)
    return () => {
      console.log(fullKey)
      eventEmitter.off(fullKey, handle)
    }
  },

  saveChatHistory: (messages) => {
    try {
      const chatHistories = localDB.getItem("chatHistories") || []
      chatHistories.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        messages: messages,
      })
      localDB.setItem("chatHistories", chatHistories)
      localDB.log("success", "成功保存聊天记录")
    } catch (error) {
      localDB.log("error", "保存聊天记录失败", error)
      throw error
    }
  },

  loadChatHistories: () => {
    try {
      const chatHistories = localDB.getItem("chatHistories")
      if (chatHistories && chatHistories.length > 0) {
        return chatHistories
      }
      return []
    } catch (error) {
      localDB.log("error", "加载聊天记录失败", error)
      throw error
    }
  },
}
