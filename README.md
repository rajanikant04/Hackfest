# AI-Powered Email Management — Atom Mail by GoFloww

Atom Mail is a smart email assistant built to streamline your inbox with cutting-edge AI technology. Built with **Next.js**, integrated with **Google OAuth**, and powered by **Gemini**, this project provides intelligent email composition, smart replies, real-time template generation, and more.

---

## Key Features

- **AI-Powered Email Composition**  
  Compose emails with context-aware, intelligent suggestions powered by Gemini.

- **Smart Email Reply Generation**  
  AI generates accurate, tone-matching replies for your emails.

- **Query Previous Emails**  
  Ask AI about your past conversations and get summarized answers instantly.

- **AI Template Builder**  
  Generate reusable templates with style customization, editable output, and real-time preview.

- **Speech-to-Text Support**  
  Seamlessly compose or command the AI using your voice with real-time transcription.

---

## Tech Stack

### Frontend

- Next.js – Powerful React framework for performance & routing  
- TypeScript – Type-safe, scalable code  
- Tailwind CSS – Rapid utility-first styling  
- Radix UI & ShadCN UI – Prebuilt accessible UI components  
- react-speech-recognition – For speech-to-text input

### Backend

- Node.js + Express – RESTful backend services  
- Convex – Real-time serverless database  
- Gmail API – Interact with Gmail to fetch/send/manage emails  
- Gemini API – Powering all AI capabilities  
- OAuth 2.0 – Secure user authentication

---

## Authentication Flow (Google OAuth)

- `GET /auth-url` – Generates Google consent URL for login  
- `GET /oauth-callback` – Handles token exchange post-login  
- Tokens are securely stored and refreshed automatically, enabling uninterrupted access to Gmail.

---

## Email Operations

- `GET /emails` – Fetch 20 recent emails (filter by labels like INBOX, STARRED)  
- `GET /emails/:id` – Fetch detailed email by ID  
- `DELETE /emails/:id` – Permanently delete an email  
- `POST /send-email` – Send an email using base64-encoded format via Gmail API
<!-- - `send-email-html` -  -->

---

## How to Run

```bash
npm install
npm run dev
