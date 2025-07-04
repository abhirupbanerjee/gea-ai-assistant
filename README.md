This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# GEA Chatbot

A Next.js-based AI assistant web application.

---

## Installation

Clone the repository and install dependencies:

```sh
git clone <your-repo-url>
cd gea-chatbot
npm install
```

---

## Dependencies

All dependencies are managed via [`package.json`](package.json).  
**Main dependencies:**
- `next`
- `react`
- `react-dom`
- `axios`
- `framer-motion`
- `jspdf`
- `react-markdown`
- `remark-gfm`
- `html2canvas`
- `@tailwindcss/postcss`
- `tailwindcss`
- `typescript`

Install all dependencies with:

```sh
npm install
```

> **Note:**  
> This project does **not** use Python or Python models. All AI interactions are handled via the OpenAI API using JavaScript/TypeScript.

---

## Running Locally

Start the development server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Building the Project

To build for production:

```sh
npm run build
```

The static export will be in the `out/` directory.

---

## Deployment

Deploy to Cloudflare Pages using Wrangler:

```sh
npm run deploy
```

---

## Environment Variables

Create a `.env.local` file with the following variables:

```
OPENAI_ASSISTANT_ID=your-assistant-id
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORGANIZATION=your-openai-org-id (optional)
ADMIN_USERS_JSON=[{"email":"admin@example.com","password":"yourpassword"}]
```

When deploying to Cloudflare Pages, set the same variables in your project
settings so they remain server-only.

---

## License

See [LICENSE](LICENSE).
## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
