import express from "express";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import { simpleParser } from "mailparser";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Google OAuth Config
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

// Pinecone Config
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Gemini AI Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Collection/Index name in Pinecone for emails
const PINECONE_INDEX = "gmail-emails";
// Dimension for Gemini embeddings
const EMBEDDING_DIMENSION = 768; // Gemini's embedding dimension

// Initialize Pinecone index
let pineconeIndex: any;
async function initPinecone() {
  try {
    // Check if index exists, if not, create it
    const indexList = await pinecone.listIndexes();
    if (!indexList.indexes.find(idx => idx.name === PINECONE_INDEX)) {
      console.log(`Creating Pinecone index: ${PINECONE_INDEX}`);
      await pinecone.createIndex({
        name: PINECONE_INDEX,
        dimension: EMBEDDING_DIMENSION, // Gemini embeddings dimension
        metric: 'cosine'
      });
      // Wait for index initialization
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    pineconeIndex = pinecone.index(PINECONE_INDEX);
    console.log("✅ Pinecone initialized");
  } catch (error) {
    console.error("Error initializing Pinecone:", error);
  }
}

// Initialize OAuth client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Function to generate embeddings using Gemini
async function generateEmbedding(text: string) {
  try {
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error("Error generating Gemini embedding:", error);
    throw error;
  }
}

// Store email in Pinecone
async function storeEmailInPinecone(email: any) {
  try {
    // Create a combined text representation of the email for embedding
    const emailContent = `From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
${email.text || ""}`;
    
    // Generate embedding
    const embedding = await generateEmbedding(emailContent);
    
    // Store in Pinecone
    await pineconeIndex.upsert([{
      id: email.id,
      values: embedding,
      metadata: {
        id: email.id,
        threadId: email.threadId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.date?.toISOString(),
        labels: email.labels,
        // Store a truncated version of the content in metadata for quick access
        snippet: (email.text || "").substring(0, 300)
      }
    }]);
    
    console.log(` Stored email ${email.id} in Pinecone`);
    return true;
  } catch (error) {
    console.error("Error storing email in Pinecone:", error);
    return false;
  }
}

// Sync emails from Gmail to Pinecone
async function syncEmailsWithPinecone() {
  try {
    await ensureValidToken();
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    // Get list of emails
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 100,  // Adjust as needed
    });
    
    if (!response.data.messages) {
      return { synced: 0 };
    }
    
    // Check which emails are already in Pinecone
    const existingIds = new Set();
    const existingEmails = await pineconeIndex.fetch({
      ids: response.data.messages.map(msg => msg.id!)
    });
    
    Object.keys(existingEmails.vectors || {}).forEach(id => {
      existingIds.add(id);
    });
    
    // Sync only new emails
    let syncedCount = 0;
    await Promise.all(
      response.data.messages
        .filter(msg => !existingIds.has(msg.id!))
        .map(async (msg) => {
          try {
            const email = await gmail.users.messages.get({
              userId: "me",
              id: msg.id!,
              format: "raw",
            });
            
            if (!email.data.raw) return;
            
            const parsedEmail = await simpleParser(
              Buffer.from(email.data.raw, "base64")
            );
            
            const emailObj = {
              id: email.data.id!,
              threadId: email.data.threadId!,
              from: parsedEmail.from?.text || "Unknown",
              to: parsedEmail.to?.text || "Unknown",
              subject: parsedEmail.subject || "No Subject",
              text: parsedEmail.text || "",
              html: parsedEmail.html || parsedEmail.textAsHtml || "",
              date: parsedEmail.date,
              labels: (email.data.labelIds || []).join(",")
            };
            
            const stored = await storeEmailInPinecone(emailObj);
            if (stored) syncedCount++;
          } catch (error) {
            console.error(`Error processing email ${msg.id}:`, error);
          }
        })
    );
    
    return { synced: syncedCount };
  } catch (error) {
    console.error("Error syncing emails:", error);
    throw error;
  }
}

// Generate summary of email using Gemini
async function generateEmailSummary(emailContent: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Summarize the following email in 2-3 sentences:
    
${emailContent}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Summary unavailable";
  }
}

// Add summaries to emails (can be used for batch processing)
async function addSummariesToEmails() {
  try {
    // Get emails without summaries
    const query = await pineconeIndex.query({
      vector: Array(EMBEDDING_DIMENSION).fill(0),
      topK: 50,
      includeMetadata: true,
      filter: {
        summary: { $exists: false }
      }
    });
    
    if (!query.matches || query.matches.length === 0) {
      return { updated: 0 };
    }
    
    let updatedCount = 0;
    
    for (const match of query.matches) {
      const email = match.metadata;
      if (!email || !email.id) continue;
      
      const emailContent = `From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
${email.snippet || ""}`;
      
      const summary = await generateEmailSummary(emailContent);
      
      // Update the metadata with the summary
      await pineconeIndex.update({
        id: email.id,
        setMetadata: {
          summary: summary
        }
      });
      
      updatedCount++;
    }
    
    return { updated: updatedCount };
  } catch (error) {
    console.error("Error adding summaries:", error);
    throw error;
  }
}

// Endpoints
app.post("/sync-emails", async (req, res) => {
  try {
    const result = await syncEmailsWithPinecone();
    res.json({ message: `Synced ${result.synced} new emails to Pinecone` });
  } catch (error) {
    console.error("Error in sync endpoint:", error);
    res.status(500).json({ error: "Failed to sync emails" });
  }
});

// Generate summaries for emails that don't have them
app.post("/generate-summaries", async (req, res) => {
  try {
    const result = await addSummariesToEmails();
    res.json({ message: `Generated summaries for ${result.updated} emails` });
  } catch (error) {
    console.error("Error generating summaries:", error);
    res.status(500).json({ error: "Failed to generate summaries" });
  }
});

// Search emails in Pinecone by text query
app.get("/search-emails", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    
    // Generate embedding for the search query
    const embedding = await generateEmbedding(query);
    
    // Search in Pinecone
    const results = await pineconeIndex.query({
      vector: embedding,
      topK: 20,
      includeMetadata: true
    });
    
    const emails = results.matches.map(match => match.metadata);
    res.json(emails);
  } catch (error) {
    console.error("Error searching emails:", error);
    res.status(500).json({ error: "Failed to search emails" });
  }
});

// Modified to check Pinecone first, then fallback to Gmail API
app.get("/emails", async (req, res) => {
  try {
    await ensureValidToken();
    
    const emailLabel = req.query.label as string;
    
    // Try to fetch from Pinecone first
    try {
      let pineconeQuery = {};
      
      if (emailLabel) {
        // Filter by label in Pinecone metadata
        pineconeQuery = {
          filter: {
            labels: { $contains: emailLabel }
          }
        };
      }
      
      const results = await pineconeIndex.query({
        vector: Array(EMBEDDING_DIMENSION).fill(0), // Default vector (will be ignored when using filter)
        topK: 20,
        includeMetadata: true,
        ...pineconeQuery
      });
      
      if (results.matches && results.matches.length > 0) {
        const emails = results.matches.map(match => match.metadata);
        return res.json(emails);
      }
    } catch (pineconeError) {
      console.error("Error fetching from Pinecone, falling back to Gmail API:", pineconeError);
    }
    
    // Fallback to the original Gmail API implementation
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    const query = emailLabel ? `label:${emailLabel}` : "in:anywhere";
    
    const labelsResponse = await gmail.users.labels.list({ userId: "me" });
    const labelsMap = new Map(
      labelsResponse.data.labels?.map((l) => [l.id, l.name]) || []
    );
    
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: query,
    });
    
    if (!response.data.messages) {
      return res.json([]);
    }
    
    const emails = await Promise.all(
      response.data.messages.map(async (msg) => {
        try {
          const email = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "raw",
          });
          
          if (!email.data.raw) return null;
          
          const parsedEmail = await simpleParser(
            Buffer.from(email.data.raw, "base64")
          );
          
          const emailLabels =
            email.data.labelIds
              ?.map((id) => {
                const labelName = labelsMap.get(id);
                return labelName ? labelName.split(" ").pop() : null;
              })
              .filter(Boolean)
              .join(", ") || "Unknown";
          
          // Create email object
          const emailObj = {
            id: email.data.id,
            from: parsedEmail.from?.text || "Unknown",
            to: parsedEmail.to?.text || "Unknown",
            subject: parsedEmail.subject || "No Subject",
            labels: emailLabels,
            body: parsedEmail.html || parsedEmail.textAsHtml || "No Content",
            text: parsedEmail.text || "",
            date: parsedEmail.date
          };
          
          // Store in Pinecone in the background
          storeEmailInPinecone(emailObj).catch(console.error);
          
          return emailObj;
        } catch (emailError) {
          console.error("Error fetching email:", emailError);
          return null;
        }
      })
    );
    
    res.json(emails.filter((email) => email !== null));
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// Get email details - check Pinecone first, then Gmail
app.get("/emails/:id", async (req, res) => {
  try {
    await ensureValidToken();
    
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Email ID is required" });
    }
    
    // Try to fetch from Pinecone first
    try {
      const result = await pineconeIndex.fetch({ ids: [id] });
      
      if (result.vectors && result.vectors[id]) {
        // We have the metadata, but need the full content from Gmail
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        const email = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "raw",
        });
        
        if (email.data.raw) {
          const parsedEmail = await simpleParser(
            Buffer.from(email.data.raw, "base64")
          );
          
          // Generate summary if it doesn't exist
          const metadata = result.vectors[id].metadata;
          let summary = metadata.summary;
          
          if (!summary && parsedEmail.text) {
            summary = await generateEmailSummary(parsedEmail.text.substring(0, 1000));
            
            // Update metadata with summary in the background
            pineconeIndex.update({
              id,
              setMetadata: { summary }
            }).catch(console.error);
          }
          
          return res.json({
            id: email.data.id,
            threadId: email.data.threadId,
            from: parsedEmail.from?.text || "Unknown",
            to: parsedEmail.to?.text || "Unknown",
            cc: parsedEmail.cc?.text || "",
            bcc: parsedEmail.bcc?.text || "",
            subject: parsedEmail.subject || "No Subject",
            date: parsedEmail.date || new Date(),
            text: parsedEmail.text || "",
            html: parsedEmail.html || parsedEmail.textAsHtml || "",
            attachments: parsedEmail.attachments || [],
            summary
          });
        }
      }
    } catch (pineconeError) {
      console.error("Error fetching from Pinecone, falling back to Gmail API:", pineconeError);
    }
    
    // Fallback to Gmail API
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const email = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "raw",
    });
    
    if (!email.data) {
      return res.status(404).json({ error: "Email not found" });
    }
    
    if (!email.data.raw) {
      return res.status(500).json({ error: "Email raw content not available" });
    }
    
    const parsedEmail = await simpleParser(
      Buffer.from(email.data.raw, "base64")
    );
    
    // Generate a summary with Gemini
    let summary = "";
    if (parsedEmail.text) {
      summary = await generateEmailSummary(parsedEmail.text.substring(0, 1000));
    }
    
    const emailObj = {
      id: email.data.id,
      threadId: email.data.threadId,
      from: parsedEmail.from?.text || "Unknown",
      to: parsedEmail.to?.text || "Unknown",
      cc: parsedEmail.cc?.text || "",
      bcc: parsedEmail.bcc?.text || "",
      subject: parsedEmail.subject || "No Subject",
      date: parsedEmail.date || new Date(),
      text: parsedEmail.text || "",
      html: parsedEmail.html || parsedEmail.textAsHtml || "",
      attachments: parsedEmail.attachments || [],
      summary
    };
    
    // Store in Pinecone in the background with the summary
    const storeObj = {...emailObj};
    storeEmailInPinecone(storeObj).catch(console.error);
    
    res.json(emailObj);
  } catch (error) {
    console.error("Error fetching email:", error);
    res.status(500).json({
      error: "Failed to fetch email",
      details: error.message,
    });
  }
});

// Answer questions about emails using Gemini
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }
    
    // Generate embedding for the question
    const embedding = await generateEmbedding(question);
    
    // Search for relevant emails
    const results = await pineconeIndex.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true
    });
    
    if (!results.matches || results.matches.length === 0) {
      return res.json({ answer: "I couldn't find any relevant emails to answer your question." });
    }
    
    // Construct context from relevant emails
    const context = results.matches
      .map(match => {
        const email = match.metadata;
        return `EMAIL:
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Date: ${email.date}
Content: ${email.snippet || ""}
${email.summary ? `Summary: ${email.summary}` : ""}
`;
      })
      .join("\n\n");
    
    // Ask Gemini to answer the question based on the emails
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `You are an AI assistant helping with email analysis. Based on the following email information, answer the user's question.

${context}

User Question: ${question}

Answer:`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.json({ 
      answer: response.text(),
      sources: results.matches.map(match => ({
        id: match.metadata.id,
        subject: match.metadata.subject,
        from: match.metadata.from,
        date: match.metadata.date
      }))
    });
  } catch (error) {
    console.error("Error answering question:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

// Delete from both Gmail and Pinecone
app.delete("/emails/:id", async (req, res) => {
  try {
    await ensureValidToken();
    
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Email ID is required" });
    }
    
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    // Delete from Gmail
    await gmail.users.messages.delete({
      userId: "me",
      id,
    });
    
    // Delete from Pinecone
    try {
      await pineconeIndex.delete({ ids: [id] });
      console.log(`✅ Email ${id} deleted from Pinecone`);
    } catch (pineconeError) {
      console.error("Error deleting from Pinecone:", pineconeError);
    }
    
    res.json({ message: "✅ Email deleted successfully!" });
  } catch (error) {
    console.error("Error deleting email:", error);
    
    if (error.message?.includes("Unauthorized")) {
      return res.status(401).json({
        error: "Authentication required. Please login again.",
      });
    }
    if (error.code === 404) {
      return res.status(404).json({ error: "Email not found" });
    }
    
    res.status(500).json({
      error: "Failed to delete email",
      details: error.message,
    });
  }
});

// Existing endpoints (unchanged)
app.post("/send-email-html", async (req, res) => {
  // console.log("📧 Send Email HTML request received");
  
    try {
      await ensureValidToken();
  
      const { recipient, subject, viewHTMLCode } = req.body;
  
      if (!recipient || !subject || !viewHTMLCode) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      // Get dynamic access token
      // console.log("Getting access token...");
      const { token } = await oauth2Client.getAccessToken();
      if (!token) {
        throw new Error("Failed to retrieve access token");
      }
  
      const email = [
        `To: ${recipient}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=UTF-8`,
        "",
        viewHTMLCode,
      ].join("\n");
      const encodedMessage = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
  
      // console.log("✅ Message encoded");
  
      // Set up Gmail API
      // console.log("Initializing Gmail API client...");
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      // console.log("✅ Gmail API client initialized");
  
      // Send the email
      // console.log("🔄 Sending email to Gmail API...");
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
        });
    // console.log("✅ Email sent successfully!");

    return res.json({ message: "✅ Email Sent!", data: response.data });
  } catch (error) {
    // console.error("❌ Error sending email:");
    // console.error(error);

    if (error.response) {
      console.error("API Response Error:", error.response.data);
    }

    return res.status(500).json({
      error: "Failed to send email",
      message: error.message,
    });
  }
});

app.post("/send-email", async (req, res) => {
  try {
    await ensureValidToken();
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const { to, subject, body } = req.body;

    const rawEmail = [`To: ${to}`, `Subject: ${subject}`, "", body].join("\n");

    const encodedMessage = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    res.json({ message: "✅ Email Sent Successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.get("/auth-url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",

      // "https://www.googleapis.com/auth/gmail.full_access",
    ],
  });
  res.json({ url });
});

app.get("/oauth-callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    oauthTokens = tokens;
    saveTokens(tokens);

    console.log("✅ OAuth Success! Tokens saved.");
    // console.log("Received Tokens:", tokens);

    res.redirect(
      `http://localhost:3000/mail?token=${tokens.access_token || ""}`
    );
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    res.status(500).send("OAuth authentication failed");
  }
});

app.post("/logout", (req, res) => {
  try {
    oauthTokens = null;
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    res.json({ message: "✅ Logged out successfully!" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Failed to log out" });
  }
});

// Token management functions
const TOKEN_PATH = "tokens.json";

function saveTokens(tokens: any) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

function loadTokens() {
  if (fs.existsSync(TOKEN_PATH)) {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  }
  return null;
}

let oauthTokens = loadTokens();

async function refreshAccessToken() {
  try {
    if (!oauthTokens?.refresh_token) {
      throw new Error("No refresh token available. Please re-authenticate.");
    }
    console.log("🔄 Refreshing access token...");
    
    oauth2Client.setCredentials(oauthTokens);
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauthTokens = credentials;
    saveTokens(credentials);
    oauth2Client.setCredentials(credentials);
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
}

async function ensureValidToken() {
  if (!oauthTokens) {
    throw new Error("Unauthorized - No tokens found");
  }
  
  const currentTime = Date.now();
  if (!oauthTokens.expiry_date || oauthTokens.expiry_date < currentTime) {
    await refreshAccessToken();
  }
  
  oauth2Client.setCredentials(oauthTokens);
}

// Initialize and start the server
(async () => {
  try {
    await initPinecone();
    app.listen(5000, () => {
      console.log("🚀 Server running on http://localhost:5000");
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
})();