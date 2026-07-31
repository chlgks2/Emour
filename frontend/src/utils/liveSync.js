const LIVE_SYNC_EVENT = 'emour:live-sync'
const LIVE_SYNC_CHANNEL =
  'emour-live-sync'

let broadcastChannel = null

function dispatchLiveSync(detail) {
  window.dispatchEvent(
    new CustomEvent(LIVE_SYNC_EVENT, {
      detail,
    }),
  )
}

function getBroadcastChannel() {
  if (
    typeof BroadcastChannel ===
    'undefined'
  ) {
    return null
  }

  if (!broadcastChannel) {
    broadcastChannel =
      new BroadcastChannel(
        LIVE_SYNC_CHANNEL,
      )

    broadcastChannel.onmessage = (
      event,
    ) => {
      dispatchLiveSync(event.data)
    }
  }

  return broadcastChannel
}

export function notifyLiveSync(
  resource = 'all',
) {
  const detail = {
    resource,
    occurredAt:
      new Date().toISOString(),
  }

  dispatchLiveSync(detail)
  getBroadcastChannel()?.postMessage(
    detail,
  )
}

export function subscribeLiveSync(
  listener,
) {
  getBroadcastChannel()

  const handleSync = (event) => {
    listener(event.detail)
  }

  window.addEventListener(
    LIVE_SYNC_EVENT,
    handleSync,
  )

  return () => {
    window.removeEventListener(
      LIVE_SYNC_EVENT,
      handleSync,
    )
  }
}
