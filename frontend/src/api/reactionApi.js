import {
  getChatMessages,
  setChatReaction,
} from './chatApi.js'

function groupReactions(messages) {
  return messages.reduce(
    (grouped, message) => {
      grouped[message.messageId] =
        message.reactions ?? []
      return grouped
    },
    {},
  )
}

export async function fetchReactions(
  roomId,
) {
  if (!roomId) {
    return {}
  }

  const response = await getChatMessages({
    roomId,
    size: 100,
  })

  return groupReactions(
    response?.messages ?? [],
  )
}

export async function setMyReaction(
  messageId,
  reactionType,
) {
  const reaction = await setChatReaction({
    messageId,
    reactionType,
  })

  return reaction ? [reaction] : []
}
