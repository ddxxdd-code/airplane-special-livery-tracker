import test from "node:test";
import assert from "node:assert/strict";

test("server module loads without starting a listener", async () => {
  const module = await import("../server.mjs");
  assert.equal(typeof module.flightResponse, "function");
  assert.equal(typeof module.server.listen, "function");
});
