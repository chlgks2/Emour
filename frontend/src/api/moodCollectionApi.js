import { apiRequest } from './httpClient.js'

function unwrap(response) {
  return response?.data ?? response ?? null
}

function getDateKey(value) {
  return value
    ? String(value).slice(0, 10)
    : ''
}

export async function getMoodEntries() {
  const response = await apiRequest(
    '/moods',
  )

  const entries = unwrap(response)
  return Array.isArray(entries)
    ? entries
    : []
}

export async function createMoodEntry(
  moodType,
  reason = '',
) {
  const response = await apiRequest(
    '/moods',
    {
      method: 'POST',
      body: {
        moodType,
        reason: reason.trim() || null,
      },
    },
  )

  return unwrap(response)
}

export async function updateMoodEntry(
  moodId,
  moodType,
) {
  const response = await apiRequest(
    `/moods/${moodId}`,
    {
      method: 'PATCH',
      body: {
        moodType,
      },
    },
  )

  return unwrap(response)
}

export function getDailyRepresentativeMood({
  entries,
  userId,
  dateKey,
}) {
  const dailyEntries = entries.filter(
    (entry) =>
      Number(entry.userId) ===
        Number(userId) &&
      getDateKey(entry.moodDatetime) ===
        dateKey,
  )

  if (dailyEntries.length === 0) {
    return null
  }

  const summary = new Map()

  dailyEntries.forEach((entry) => {
    const previous =
      summary.get(entry.moodType) ?? {
        count: 0,
        latestTime: 0,
        latestEntry: entry,
      }

    const entryTime =
      new Date(
        entry.moodDatetime,
      ).getTime() || 0

    summary.set(entry.moodType, {
      count: previous.count + 1,
      latestTime: Math.max(
        previous.latestTime,
        entryTime,
      ),
      latestEntry:
        entryTime >= previous.latestTime
          ? entry
          : previous.latestEntry,
    })
  })

  const representative =
    [...summary.entries()].sort(
      (
        [moodTypeA, valueA],
        [moodTypeB, valueB],
      ) =>
        valueB.count - valueA.count ||
        valueB.latestTime -
          valueA.latestTime ||
        moodTypeA.localeCompare(
          moodTypeB,
        ),
    )[0]

  return {
    ...representative[1].latestEntry,
    moodType: representative[0],
    sampleCount:
      representative[1].count,
    totalSampleCount:
      dailyEntries.length,
  }
}
