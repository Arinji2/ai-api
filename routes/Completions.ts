import { Hono } from "hono";
import { CompletionsRequestSchema } from "../schemas";
import type { CompletionsRequestType } from "../types";

const completions = new Hono();
//you can only make 500 requests per day

const currentDay = new Date().getDay();
let requestCount = 0;

completions.post("/", async (c) => {
  if (requestCount >= 2) {
    c.status(429);
    return c.json({
      message:
        "Too many requests, please wait for day end to make more requests.",
    });
  }
  const body = await c.req.json();

  if (c.req.header("AUTHORIZATION") !== process.env.ACCESS_KEY) {
    c.status(401);
    return c.json({
      message: "Unauthorized",
    });
  }

  if (!Array.isArray(body)) {
    c.status(400);
    return c.json({
      message: "Bad Request",
    });
  }

  const currentTime = Date.now();

  const completions = body
    .map((item: any) => {
      const parse = CompletionsRequestSchema.safeParse(item);
      if (!parse.success) {
        return null;
      }
      return item;
    })
    .filter((item: any) => item !== null) as CompletionsRequestType[];

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.API_KEY}`,
      "Content-Type": "application/json",
    },
    body: `{"model":"gpt-3.5-turbo","messages":${JSON.stringify(completions)}}`,
  };

  const response = await (
    await fetch("https://api.shuttleai.app/v1/chat/completions", options)
  ).json();

  const endTime = Date.now();

  if (endTime - currentTime < 12000) {
    await new Promise((resolve) =>
      setTimeout(resolve, 12000 - (endTime - currentTime))
    );
  }

  if (currentDay !== new Date().getDay()) {
    requestCount = 0;
  }

  requestCount++;

  return c.json({
    message: response.choices[0].message,
  });
});

export default completions;
