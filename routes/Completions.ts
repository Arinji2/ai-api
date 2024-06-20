import { Hono } from "hono";
import { Resend } from "resend";
import { CompletionsRequestSchema } from "../schemas";
import type { CompletionsRequestType } from "../types";

const completions = new Hono();

async function CheckRequests(from: string) {
  if (requestDate !== new Date().getDay()) {
    requestCount = 1;

    await Bun.write(
      "routes/requests.json",
      JSON.stringify({
        requests: requestCount,
        [from]: 1,
        date: new Date().getDay(),
      })
    );
  } else {
    requestCount++;

    const requests = (await Bun.file("routes/requests.json").json()) as {
      [key: string]: number;
    };
    if (requestCount >= 250) {
      const resend = new Resend(process.env.EMAIL_KEY);

      await resend.emails.send({
        from: "ai@mail.arinji.com",
        to: "arinjaydhar205@gmail.com",
        subject: "Request Limit Close to Exceeding",
        text: `Your request limit is close to exceeding, following are the values: \n ${JSON.stringify(
          requests
        )}`,
      });
    }
    const requestHost = requests[from] || 0;

    await Bun.write(
      "routes/requests.json",
      JSON.stringify({
        requests: requestCount,
        [from]: requestHost + 1,
      })
    );
  }
}

async function InitRequests() {
  const exists = await Bun.file("routes/requests.json").exists();
  if (!exists) {
    await Bun.write(
      "routes/requests.json",
      JSON.stringify({ requests: 0, date: new Date().getDay() })
    );
    return {
      requestCount: 0,
      requestDate: new Date().getDay(),
    };
  }

  const data = await Bun.file("routes/requests.json").json();
  return {
    requestCount: data.requests,
    requestDate: data.date,
  };
}
let { requestCount, requestDate } = await InitRequests();

completions.post("/", async (c) => {
  if (requestCount >= 400) {
    c.status(429);
    return c.json({
      message:
        "Too many requests, please wait for day end to make more requests.",
    });
  }
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
    body: `{"model":"gpt-3.5-turbo","messages":${JSON.stringify(completions)}}`,
  };

  const response = await (
    await fetch("https://api.shuttleai.app/v1/chat/completions", options)
  ).json();

  const endTime = Date.now();

  if (c.req.header("SPEED") !== "FAST" && endTime - currentTime < 12000) {
    await new Promise((resolve) =>
      setTimeout(resolve, 12000 - (endTime - currentTime))
    );
  }

  CheckRequests(c.req.header("FROM") as string);

  return c.json({
    message: response.choices[0].message,
  });
});

export default completions;
