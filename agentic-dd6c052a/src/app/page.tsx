"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedlyArticle } from "@/lib/article-utils";
import {
  formatPublishedDate,
  resolveArticleUrl,
  stripHtml,
} from "@/lib/article-utils";

type FeedlyResponse = {
  items: FeedlyArticle[];
  continuation?: string;
};

const STORAGE_KEYS = {
  feedlyToken: "linkedin-agent-feedly-token",
  feedlyStream: "linkedin-agent-feedly-stream",
  openAIKey: "linkedin-agent-openai-key",
  template: "linkedin-agent-template",
};

const DEFAULT_TEMPLATE = `You are a LinkedIn content strategist who writes engaging posts that spark thoughtful discussion.

Write a LinkedIn post that:
- Summarizes the key insight from "{{title}}"
- Highlights why it matters to professionals in the field
- Offers a unique point of view or actionable takeaway
- Encourages the audience to comment with their perspective

Keep the tone optimistic, insightful, and human. Use short paragraphs and tasteful formatting.

Reference details:
- Article summary: {{summary}}
- Source: {{source}}
- Author: {{author}}
- Link: {{url}}

Finish with a light call-to-action that invites comments.`;

export default function Home() {
  const [feedlyToken, setFeedlyToken] = useState("");
  const [streamId, setStreamId] = useState("");
  const [openAIKey, setOpenAIKey] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [articleCount, setArticleCount] = useState("10");
  const [articles, setArticles] = useState<FeedlyArticle[]>([]);
  const [continuation, setContinuation] = useState<string | undefined>();
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const [generatedPost, setGeneratedPost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedToken = window.localStorage.getItem(STORAGE_KEYS.feedlyToken);
    const storedStream = window.localStorage.getItem(STORAGE_KEYS.feedlyStream);
    const storedOpenAI = window.localStorage.getItem(STORAGE_KEYS.openAIKey);
    const storedTemplate = window.localStorage.getItem(STORAGE_KEYS.template);

    if (storedToken) setFeedlyToken(storedToken);
    if (storedStream) setStreamId(storedStream);
    if (storedOpenAI) setOpenAIKey(storedOpenAI);
    if (storedTemplate) setTemplate(storedTemplate);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.feedlyToken, feedlyToken);
  }, [feedlyToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.feedlyStream, streamId);
  }, [streamId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.openAIKey, openAIKey);
  }, [openAIKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.template, template);
  }, [template]);

  const selectedArticle = useMemo(
    () => articles.find((item) => item.id === selectedArticleId) ?? null,
    [articles, selectedArticleId],
  );

  const handleFetch = useCallback(
    async (nextPage = false) => {
      if (!feedlyToken || !streamId) {
        setError("Feedly token and stream ID are required.");
        return;
      }
      setIsLoadingFeed(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch("/api/feedly", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: feedlyToken,
            streamId,
            count: Number.parseInt(articleCount, 10) || 10,
            continuation: nextPage ? continuation : undefined,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.error || `Feedly request failed (${response.status})`,
          );
        }

        const data = (await response.json()) as FeedlyResponse;
        setContinuation(data.continuation);
        setArticles((prev) =>
          nextPage ? [...prev, ...(data.items ?? [])] : data.items ?? [],
        );
        if (!nextPage) {
          setSelectedArticleId(data.items?.[0]?.id ?? null);
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unable to fetch from Feedly.",
        );
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [feedlyToken, streamId, articleCount, continuation],
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedArticle) {
      setError("Select an article to generate a post.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          article: selectedArticle,
          template,
          apiKey: openAIKey || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error || `Generation failed (${response.status})`,
        );
      }

      const payload = (await response.json()) as { post: string };
      setGeneratedPost(payload.post);
      setSuccessMessage("Post generated successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to generate post.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedArticle, template, openAIKey]);

  const handleCopy = useCallback(async () => {
    if (!generatedPost) return;
    try {
      await navigator.clipboard.writeText(generatedPost);
      setSuccessMessage("Copied LinkedIn draft to clipboard.");
    } catch (err) {
      console.error(err);
      setError("Unable to copy to clipboard. Copy manually instead.");
    }
  }, [generatedPost]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <aside className="w-full space-y-6 rounded-3xl bg-slate-900/80 p-6 shadow-2xl ring-1 ring-white/10 lg:max-w-sm">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">
              LinkedIn Agent Studio
            </h1>
            <p className="text-sm text-slate-300">
              Connect Feedly intelligence with AI-crafted narratives. Save your
              tokens locally and iterate on prompt templates without leaving the
              browser.
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Feedly Connection
            </h2>
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Feedly OAuth Token</span>
              <input
                value={feedlyToken}
                onChange={(event) => setFeedlyToken(event.target.value)}
                placeholder="feedly developer token"
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                type="password"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Stream ID or Collection</span>
              <input
                value={streamId}
                onChange={(event) => setStreamId(event.target.value)}
                placeholder="enterprise/category/techpulse"
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Stories per fetch</span>
              <input
                value={articleCount}
                onChange={(event) => setArticleCount(event.target.value)}
                placeholder="10"
                min={1}
                max={50}
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                type="number"
              />
            </label>
            <button
              onClick={() => handleFetch(false)}
              disabled={isLoadingFeed}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              {isLoadingFeed ? "Fetching stories..." : "Fetch fresh stories"}
            </button>
            {continuation && (
              <button
                onClick={() => handleFetch(true)}
                disabled={isLoadingFeed}
                className="flex w-full items-center justify-center rounded-xl border border-emerald-300/40 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-200 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
              >
                {isLoadingFeed ? "Loading more..." : "Load more from stream"}
              </button>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              AI Author
            </h2>
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">OpenAI API Key</span>
              <input
                value={openAIKey}
                onChange={(event) => setOpenAIKey(event.target.value)}
                placeholder="sk-..."
                type="password"
                className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Prompt Template</span>
              <textarea
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                className="h-48 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <p className="text-xs text-slate-400">
                Available tokens:{" "}
                <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">
                  {"{{title}} {{summary}} {{source}} {{author}} {{url}} {{keywords}}"}
                </code>
              </p>
            </label>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedArticle}
              className="flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-sky-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-700/50"
            >
              {isGenerating ? "Drafting post..." : "Generate LinkedIn post"}
            </button>
          </section>

          {(error || successMessage) && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                error ? "bg-red-500/20 text-red-200" : "bg-emerald-500/20 text-emerald-200"
              }`}
            >
              {error ?? successMessage}
            </div>
          )}
        </aside>

        <main className="flex-1 space-y-6 rounded-3xl bg-white/5 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur">
          <section className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Curated Feedly insights
                </h2>
                <p className="text-sm text-slate-300">
                  Tap a story to set context for the LinkedIn draft. Summaries
                  are cleaned for clarity.
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {articles.length} stories loaded
              </span>
            </header>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {articles.map((article) => {
                const summary =
                  stripHtml(article.summary?.content) ||
                  stripHtml(article.content?.content) ||
                  "No summary available.";
                const isSelected = selectedArticleId === article.id;
                return (
                  <article
                    key={article.id}
                    onClick={() =>
                      setSelectedArticleId(
                        isSelected ? null : (article.id as string),
                      )
                    }
                    className={`group flex cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-slate-900/60 p-4 transition ${
                      isSelected
                        ? "border-sky-400/60 bg-slate-900/90 shadow-lg"
                        : "hover:border-sky-300/40 hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                      <span>{article.origin?.title ?? "Unknown source"}</span>
                      <span>{formatPublishedDate(article.published)}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {article.title ?? "Untitled insight"}
                    </h3>
                    <p className="line-clamp-4 text-sm leading-relaxed text-slate-300">
                      {summary}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {article.keywords?.slice(0, 4).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    <a
                      href={resolveArticleUrl(article)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto text-xs font-medium text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      View original
                    </a>
                  </article>
                );
              })}
              {!articles.length && (
                <div className="col-span-1 rounded-2xl border border-dashed border-white/20 bg-slate-900/60 p-8 text-center text-sm text-slate-400 lg:col-span-2">
                  No stories yet. Connect to your Feedly stream to see the
                  latest intelligence roll in.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  LinkedIn draft canvas
                </h2>
                <p className="text-sm text-slate-300">
                  Refine your AI output, then copy to share with your network.
                </p>
              </div>
              <button
                onClick={handleCopy}
                disabled={!generatedPost}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-emerald-300/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-500"
              >
                Copy draft
              </button>
            </header>

            <textarea
              value={generatedPost}
              onChange={(event) => setGeneratedPost(event.target.value)}
              placeholder="Generated posts will appear here. You can keep editing manually."
              className="min-h-[320px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </section>
        </main>
      </div>
    </div>
  );
}
