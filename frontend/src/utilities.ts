import type { prMergeTimeData, reviewSpeedData, reviewTimeBreakdownData } from "./interfaces";

function toLocalDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function filterLastXDaysPRMergeData(
  data: prMergeTimeData[],
  days: number
): prMergeTimeData[] {
  const now = new Date();

  const startOfToday = toLocalDate(now);

  const cutoff = new Date(startOfToday);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return data.filter((item) => {
    const d = new Date(item.dateTime);
    const localDate = toLocalDate(d);

    return localDate >= cutoff && localDate <= startOfToday;
  });
}

export function filterLastXDaysReviewSpeedData(
  data: reviewSpeedData[],
  days: number
): reviewSpeedData[] {
  const now = new Date();

  const startOfToday = toLocalDate(now);

  const cutoff = new Date(startOfToday);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return data.filter((item) => {
    const d = new Date(item.dateTime);
    const localDate = toLocalDate(d);

    return localDate >= cutoff && localDate <= startOfToday;
  });
}

export function filterLastXDaysReviewTimeBreakdownData(
  data: reviewTimeBreakdownData[],
  days: number
): reviewTimeBreakdownData[] {
  const now = new Date();

  const startOfToday = toLocalDate(now);

  const cutoff = new Date(startOfToday);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return data.filter((item) => {
    const d = new Date(item.dateTime);
    const localDate = toLocalDate(d);

    return localDate >= cutoff && localDate <= startOfToday;
  });
}



function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

export function groupReviewTimeBreakdownBy7Days(
  data: reviewTimeBreakdownData[],
  window: number
): reviewTimeBreakdownData[] {
  const now = new Date()
  const endDate = toLocalDate(now)

  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (window - 1))

  const valueByDate = new Map<string, reviewTimeBreakdownData>()

  for (const item of data) {
    const parsed = new Date(item.dateTime)
    const localDate = toLocalDate(parsed)
    const dateKey = formatDateKey(localDate)

    valueByDate.set(dateKey, item)
  }

  const dailySeries: reviewTimeBreakdownData[] = []

  for (
    const current = new Date(startDate);
    current <= endDate;
    current.setDate(current.getDate() + 1)
  ) {
    const day = new Date(current)
    const dateKey = formatDateKey(day)
    const existing = valueByDate.get(dateKey)

    dailySeries.push({
      dateTime: dateKey,
      under8Hours: existing?.under8Hours ?? 0,
      under24Hours: existing?.under24Hours ?? 0,
      under3Days: existing?.under3Days ?? 0,
      over3Days: existing?.over3Days ?? 0,
    })
  }

  const grouped: reviewTimeBreakdownData[] = []

  const expectedBucketCount = Math.ceil(window / 7)

  for (let bucketIndex = 0; bucketIndex < expectedBucketCount; bucketIndex++) {
    const chunkEnd = dailySeries.length - 1 - bucketIndex * 7
    const chunkStart = Math.max(0, chunkEnd - 6)

    if (chunkEnd < 0) {
      break
    }

    const chunk = dailySeries.slice(chunkStart, chunkEnd + 1)

    let under8Hours = 0
    let under24Hours = 0
    let under3Days = 0
    let over3Days = 0

    for (const item of chunk) {
      under8Hours += item.under8Hours
      under24Hours += item.under24Hours
      under3Days += item.under3Days
      over3Days += item.over3Days
    }

    grouped.push({
      dateTime: chunk[0].dateTime,
      under8Hours,
      under24Hours,
      under3Days,
      over3Days,
    })
  }

  grouped.sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  )

  return grouped
}