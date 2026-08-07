import { createContext, useContext } from 'react'

export const ChatUnreadContext = createContext(null)

export function useChatUnread() {
  const context = useContext(ChatUnreadContext)

  if (!context) {
    throw new Error(
      'useChatUnread는 ChatUnreadProvider 내부에서만 사용할 수 있어요.',
    )
  }

  return context
}
