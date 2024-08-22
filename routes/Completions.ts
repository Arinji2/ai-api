import {
  GoogleGenerativeAI,
  GoogleGenerativeAIError,
} from "@google/generative-ai";
import { Hono } from "hono";
import { Resend } from "resend";

const completions = new Hono();
const resend = new Resend(process.env.EMAIL_KEY);

async function generateResponse(prompt: string, retries = 3): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 2.0,
    },
  });

  try {
    let result = (
      await model.generateContent(prompt)
    ).response.text() as string;

    // Remove special characters, HTML tags, and markdown formatting
    result = result
      .replace(/\n/g, " ")
      .replace(/[\*\`~#@\$%\^&\=\+\-\_\|\"\/]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/~~/g, "")
      .replace(/^#+/gm, "")
      .trim();

    return result;
  } catch (error) {
    if (error instanceof GoogleGenerativeAIError && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return generateResponse(prompt, retries - 1);
    }
    throw error;
  }
}

completions.post("/", async (c) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  try {
    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      c.status(400);
      return c.json({
        message: "Bad Request",
      });
    }

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

    const prompt = body[0]?.content || body[0];
    const result = await generateResponse(prompt);

    return c.json({
      message: result,
    });
  } catch (error) {
    c.status(500);
    return c.json({
      message: "Server Error",
    });
  }
});

export default completions;
