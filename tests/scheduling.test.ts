import { describe, expect, it } from "vitest"
import { computeAvailableSlots, type AvailabilityInput } from "@/lib/scheduling/availability"
import { addDays, localDayBounds, toLocalDate, weekdayOf, zonedToUtc } from "@/lib/scheduling/time"

const SP = "America/Sao_Paulo"

describe("time helpers", () => {
  it("converts local wall time to UTC for São Paulo (UTC-3)", () => {
    expect(zonedToUtc("2026-10-05", 9 * 60, SP).toISOString()).toBe("2026-10-05T12:00:00.000Z")
  })

  it("respects daylight saving transitions", () => {
    // Nova York: EDT (UTC-4) em julho, EST (UTC-5) em dezembro.
    expect(zonedToUtc("2026-07-01", 9 * 60, "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z")
    expect(zonedToUtc("2026-12-01", 9 * 60, "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z")
  })

  it("derives local date, weekday and day bounds", () => {
    expect(toLocalDate(new Date("2026-10-06T02:00:00Z"), SP)).toBe("2026-10-05")
    expect(weekdayOf("2026-10-05")).toBe(1)
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    const { start, end } = localDayBounds("2026-10-05", SP)
    expect(start.toISOString()).toBe("2026-10-05T03:00:00.000Z")
    expect(end.toISOString()).toBe("2026-10-06T03:00:00.000Z")
  })
})

describe("computeAvailableSlots", () => {
  // 2026-10-05 é segunda-feira.
  const base: AvailabilityInput = {
    date: "2026-10-05",
    timeZone: SP,
    durationMinutes: 30,
    slotIntervalMinutes: 30,
    workingHours: [
      { weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 },
      { weekday: 1, startMinute: 13 * 60, endMinute: 14 * 60 },
    ],
    busy: [],
    now: new Date("2026-10-01T00:00:00Z"),
    minLeadMinutes: 0,
  }

  const hours = (slots: Date[]) =>
    slots.map((slot) => slot.toLocaleTimeString("pt-BR", { timeZone: SP, hour: "2-digit", minute: "2-digit" }))

  it("slices working blocks by the service duration and skips the lunch gap", () => {
    expect(hours(computeAvailableSlots(base))).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "13:00",
      "13:30",
    ])
  })

  it("returns nothing on days without working hours", () => {
    expect(computeAvailableSlots({ ...base, date: "2026-10-04" })).toEqual([])
  })

  it("does not offer a slot that would end after the block", () => {
    const slots = computeAvailableSlots({ ...base, durationMinutes: 60, workingHours: [base.workingHours[1]] })
    expect(hours(slots)).toEqual(["13:00"])
  })

  it("removes slots that overlap existing bookings and time off", () => {
    const slots = computeAvailableSlots({
      ...base,
      busy: [
        { startsAt: zonedToUtc("2026-10-05", 9 * 60 + 15, SP), endsAt: zonedToUtc("2026-10-05", 9 * 60 + 45, SP) },
        { startsAt: zonedToUtc("2026-10-05", 11 * 60, SP), endsAt: zonedToUtc("2026-10-05", 14 * 60, SP) },
      ],
    })
    expect(hours(slots)).toEqual(["10:00", "10:30"])
  })

  it("keeps a slot that starts exactly when a booking ends", () => {
    const slots = computeAvailableSlots({
      ...base,
      workingHours: [base.workingHours[1]],
      busy: [{ startsAt: zonedToUtc("2026-10-05", 13 * 60, SP), endsAt: zonedToUtc("2026-10-05", 13 * 60 + 30, SP) }],
    })
    expect(hours(slots)).toEqual(["13:30"])
  })

  it("honours the minimum lead time", () => {
    const slots = computeAvailableSlots({
      ...base,
      now: zonedToUtc("2026-10-05", 10 * 60 + 50, SP),
      minLeadMinutes: 30,
    })
    expect(hours(slots)).toEqual(["11:30", "13:00", "13:30"])
  })
})
