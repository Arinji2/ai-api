import { Hono } from "hono";
import { Resend } from "resend";
import { CompletionsRequestSchema } from "../schemas";
import type { CompletionsRequestType } from "../types";

const completions = new Hono();
const resend = new Resend(process.env.EMAIL_KEY);

completions.post("/", async (c) => {
  const body = await c.req.json();
  //get domain of the request

  if (c.req.header("AUTHORIZATION") != process.env.ACCESS_KEY) {
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
    body: `{"model":"gpt-3.5-turbo-0125","messages":${JSON.stringify(
      completions
    )}, "temperature": 1}`,
  };

  const response = await fetch(
    "https://api.shuttleai.app/v1/chat/completions",
    options
  );

  if (response.status === 429) {
    c.status(429);
    await resend.emails.send({
      from: "ai@mail.arinji.com",
      to: "arinjaydhar205@gmail.com",
      subject: "Daily Request Limit Exceeded",
      text: `Request Limit Exceeded for the completions route. Current Time: ${new Date().toLocaleString()}`,
    });
    return c.json({
      message: "Rate Limit Exceeded",
    });
  }

  const messages = await response.json();

  const endTime = Date.now();

  if (c.req.header("SPEED") !== "FAST" && endTime - currentTime < 12000) {
    await new Promise((resolve) =>
      setTimeout(resolve, 12000 - (endTime - currentTime))
    );
  }

  return c.json({
    message: messages.choices[0].message,
  });
});

export default completions;
