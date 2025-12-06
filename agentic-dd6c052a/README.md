## LinkedIn Agent Studio

LinkedIn Agent Studio pairs Feedly intelligence with an AI copywriter that drafts polished LinkedIn posts in seconds.

### ✨ Capabilities
- Pull curated stories from any Feedly stream using your developer token.
- Inspect summaries, metadata, and quickly select the article you want to amplify.
- Craft reusable prompt templates with liquid-style tokens such as `{{title}}`, `{{summary}}`, and `{{url}}`.
- Generate LinkedIn-ready copy using OpenAI models, then edit inline or copy with one click.
- All keys and prompt preferences persist locally in the browser (never stored on the server).

### 🛠️ Prerequisites
- Node.js 18.17+ and npm.
- Feedly developer token with permission to access the target stream.
- OpenAI API key (set `OPENAI_API_KEY` locally or paste it in the UI).

Create a `.env.local` file using the provided `.env.example` template:

```bash
cp .env.example .env.local
```

Populate it with your OpenAI credentials and optionally override the default model.

### ▶️ Development

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to start orchestrating your content pipeline.

### 🚀 Production Build

```bash
npm run build
npm run start
```

Deployments are optimized for Vercel out of the box.
