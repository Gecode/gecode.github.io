import { describe, expect, it, vi } from "vitest";
import { destinationsFor, routeEmail } from "./index";

describe("Gecode email routing", () => {
  it("attempts both destinations even if the first forward fails", async () => {
    const forward = vi.fn().mockRejectedValueOnce(new Error("destination unavailable")).mockResolvedValueOnce(undefined);
    await expect(routeEmail({ to: "info@gecode.dev", forward } as unknown as ForwardableEmailMessage)).rejects.toThrow();
    expect(forward.mock.calls).toEqual([["guido.tack@monash.edu"], ["zayenz@gmail.com"]]);
  });
  it.each([
    ["tack@gecode.dev", ["guido.tack@monash.edu"]],
    ["lagerkvist@gecode.dev", ["zayenz@gmail.com"]],
    ["zayenz@gecode.dev", ["zayenz@gmail.com"]],
    ["info@gecode.dev", ["guido.tack@monash.edu", "zayenz@gmail.com"]],
    ["schulte@gecode.dev", ["guido.tack@monash.edu", "zayenz@gmail.com"]],
    ["chschulte@gecode.dev", ["guido.tack@monash.edu", "zayenz@gmail.com"]],
    ["anything-else@gecode.dev", ["zayenz@gmail.com"]],
    ["info@example.com", []],
  ])("routes %s", (recipient, destinations) => {
    expect(destinationsFor(recipient)).toEqual(destinations);
  });
});
