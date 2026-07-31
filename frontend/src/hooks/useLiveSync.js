import {
  useEffect,
  useRef,
} from 'react'

import {
  subscribeLiveSync,
} from '../utils/liveSync.js'

const DEFAULT_INTERVAL = 3000

export function useLiveSync(
  refresh,
  {
    enabled = true,
    intervalMs = DEFAULT_INTERVAL,
  } = {},
) {
  const refreshRef = useRef(refresh)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let isDisposed = false

    const runRefresh = async () => {
      if (
        isDisposed ||
        isRefreshingRef.current ||
        document.visibilityState ===
          'hidden'
      ) {
        return
      }

      isRefreshingRef.current = true

      try {
        await refreshRef.current?.()
      } finally {
        isRefreshingRef.current = false
      }
    }

    const intervalId =
      window.setInterval(
        runRefresh,
        intervalMs,
      )
    const unsubscribe =
      subscribeLiveSync(runRefresh)

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        runRefresh()
      }
    }

    window.addEventListener(
      'focus',
      runRefresh,
    )
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
      unsubscribe()
      window.removeEventListener(
        'focus',
        runRefresh,
      )
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [enabled, intervalMs])
}
