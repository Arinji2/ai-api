import { Hono } from "hono";
import { Resend } from "resend";

const completions = new Hono();
const resend = new Resend(process.env.EMAIL_KEY);

completions.post("/", async (c) => {
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

    const currentTime = Date.now();

    const { GoogleGenerativeAI } = require("@google/generative-ai");

    const genAI = new GoogleGenerativeAI(process.env.API_KEY);

    let prompt = "";
    console.log(body);
    if (body[0].content) {
      prompt = body[0].content;
    } else prompt = body[0];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let result = (
      await model.generateContent(prompt)
    ).response.text() as string;

    //remove any special characters
    result = result.replace(/\n/g, " ");
    result = result.replace(/\*/g, "");
    result = result.replace(/\//g, "");
    result = result.replace(/`/g, "");
    result = result.replace(/~/g, "");
    result = result.replace(/#/g, "");
    result = result.replace(/@/g, "");
    result = result.replace(/\$/g, "");
    result = result.replace(/\^/g, "");
    result = result.replace(/\&/g, "");
    result = result.replace(/\%/g, "");
    result = result.replace(/\=/g, "");
    result = result.replace(/\+/g, "");
    result = result.replace(/\-/g, "");
    result = result.replace(/\_/g, "");
    result = result.replace(/\|/g, "");
    result = result.replace(/\"/g, "");

    //remove any html tags
    result = result.replace(/<[^>]*>/g, "");

    //remove any markdown formatting
    result = result.replace(/~~/g, "");
    result = result.replace(/`/g, "");
    result = result.replace(/^#+/gm, "");

    result = result.trim();

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
