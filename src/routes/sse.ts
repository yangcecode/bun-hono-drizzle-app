import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Env } from "../types/env";

const sse = new Hono<Env>();

sse.get("/stream", async (c) => {
  return streamSSE(c, async (stream) => {
    let id = 0;
    while (true) {
      const message = `It is ${new Date().toISOString()}`;
      await stream.writeSSE({
        data: message,
        event: "time-update",
        id: String(id++),
      });
      await stream.sleep(1000);

      // Stop after 10 seconds for demo purposes to avoid infinite loop resource usage in dev
      if (id > 10) {
        break;
      }
    }
  });
});

export default sse;
