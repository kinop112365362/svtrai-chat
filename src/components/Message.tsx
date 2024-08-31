import { toast } from "sonner"
import { CheckCircle, XCircle, AlertCircle, Info, Trash2 } from "lucide-react"

type MessageType = "success" | "error" | "warning" | "info" | "delete"

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  delete: Trash2,
}

const colors = {
  success: "text-green-500",
  error: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
  delete: "text-gray-500",
}

const showMessage = (type: MessageType, content: string, duration = 3000): string => {
  const Icon = icons[type]
  return toast[type === "delete" ? "error" : type](content, {
    duration,
  })
}

export const message = {
  success: (content: string, duration?: number) => showMessage("success", content, duration),
  error: (content: string, duration?: number) => showMessage("error", content, duration),
  warning: (content: string, duration?: number) => showMessage("warning", content, duration),
  info: (content: string, duration?: number) => showMessage("info", content, duration),
  delete: (content: string, duration?: number) => showMessage("delete", content, duration),
  dismiss: (toastId: string) => toast.dismiss(toastId),
}
