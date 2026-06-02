import { describe, expect, it } from "vitest";
import { clockLabel, seasonFor, seedFor, timeOfDayFor } from "../src/context/clock";

function at(h: number, m = 0, month = 0, day = 15): Date {
  return new Date(2025, month, day, h, m, 0);
}

describe("timeOfDayFor", () => {
  it("maps hours into the right buckets", () => {
    expect(timeOfDayFor(at(6))).toBe("dawn");
    expect(timeOfDayFor(at(9))).toBe("morning");
    expect(timeOfDayFor(at(12))).toBe("noon");
    expect(timeOfDayFor(at(15))).toBe("afternoon");
    expect(timeOfDayFor(at(18))).toBe("dusk");
    expect(timeOfDayFor(at(23))).toBe("night");
    expect(timeOfDayFor(at(2))).toBe("night");
  });
});

describe("seasonFor", () => {
  it("maps months to meteorological seasons", () => {
    expect(seasonFor(at(12, 0, 0))).toBe("winter"); // Jan
    expect(seasonFor(at(12, 0, 3))).toBe("spring"); // Apr
    expect(seasonFor(at(12, 0, 6))).toBe("summer"); // Jul
    expect(seasonFor(at(12, 0, 9))).toBe("autumn"); // Oct
  });
});

describe("seedFor", () => {
  it("is stable within a 20-minute slot and changes across slots", () => {
    expect(seedFor(at(10, 5))).toBe(seedFor(at(10, 15)));
    expect(seedFor(at(10, 5))).not.toBe(seedFor(at(10, 25)));
  });
});

describe("clockLabel", () => {
  it("formats 12-hour time with meridiem", () => {
    expect(clockLabel(at(6, 41))).toBe("6:41 a.m.");
    expect(clockLabel(at(0, 5))).toBe("12:05 a.m.");
    expect(clockLabel(at(13, 9))).toBe("1:09 p.m.");
  });
});
