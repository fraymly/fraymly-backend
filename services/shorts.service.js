import { slugify } from '../utils/slug.js'

export function buildShortPlan({
  videoDurationSeconds,
  shortCount,
  targetDurationSeconds,
  title,
}) {
  const count = Math.max(1, Number(shortCount) || 3)
  const target = Math.max(10, Number(targetDurationSeconds) || 30)
  const videoDuration = Math.max(target, Number(videoDurationSeconds) || count * target * 1.5)
  const spacing = videoDuration / (count + 1)

  return Array.from({ length: count }, (_, index) => {
    const idealStart = Math.max(0, Math.min(videoDuration - target, spacing * (index + 1) - target / 2))
    const startTime = Number(idealStart.toFixed(2))
    const endTime = Number(Math.min(videoDuration, startTime + target).toFixed(2))
    const durationSeconds = Number((endTime - startTime).toFixed(2))
    const slug = slugify(title ?? 'viral-short')

    return {
      index: index + 1,
      title: `${title ?? 'Viral Short'} ${index + 1}`,
      slug,
      startTime,
      endTime,
      durationSeconds,
      score: Math.max(60, 96 - index * 4),
      notes: `Planned from ${startTime}s to ${endTime}s.`,
    }
  })
}

