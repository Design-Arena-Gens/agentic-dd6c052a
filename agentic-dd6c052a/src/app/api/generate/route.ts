import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  mergeTemplate,
  type FeedlyArticle,
  stripHtml,
} from "@/lib/article-utils";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are a senior LinkedIn content strategist. You write concise, high-impact posts that blend insight, empathy, and a clear call to action. Keep paragraphs short, avoid hashtags unless essential, and never invent facts.";

type GenerateBody = {
  article?: FeedlyArticle;
  template?: string;
  apiKey?: string;
};

export async function POST(request: Request) {
  try {
    const { article, template, apiKey }: GenerateBody = await request.json();

    if (!article || typeof article !== "object") {
      return NextResponse.json(
        { error: "An article payload is required to generate a post." },
        { status: 400 },
      );
    }

    const userTemplate =
      typeof template === "string" && template.trim().length > 0
        ? template
        : "Write a LinkedIn post summarizing {{title}}.";

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is missing. Provide it in the UI or configure OPENAI_API_KEY.",
        },
        { status: 400 },
      );
    }

    if (!DEFAULT_MODEL) {
      return NextResponse.json(
        { error: "No OpenAI model configured. Set OPENAI_MODEL." },
        { status: 500 },
      );
    }

    const client = new OpenAI({ apiKey: key });
    const prompt = mergeTemplate(userTemplate, {
      ...article,
      summary: { content: article.summary?.content ?? stripHtml(article.content?.content) },
    });

    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const post =
      completion.choices?.[0]?.message?.content?.trim() ??
      "Unable to generate a post. Please refine your prompt.";

    return NextResponse.json({ post });
  } catch (error) {
    console.error("LinkedIn generator error", error);
    return NextResponse.json(
      { error: "AI provider request failed. Check logs and credentials." },
      { status: 500 },
    );
  }
}
