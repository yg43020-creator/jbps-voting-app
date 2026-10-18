
const express = require("express");

const app = express();
app.use(express.json({ limit: "20kb" }));

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    const message = String(req.body.message || "").trim();

    if (!message || message.length > 1000) {
      return res.status(400).json({
        error: "Please enter a question under 1000 characters."
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-10)
      : [];

    const contents = history
      .filter(item =>
        ["user", "model"].includes(item.role) &&
        typeof item.text === "string"
      )
      .map(item => ({
        role: item.role,
        parts: [{ text: item.text.slice(0, 1000) }]
      }));

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const prompt = `
You are Sukoon 11 ❤️, the friendly AI help assistant
for Jingle Bells Public School's Ullas 2.0 live performance
website.

Help parents understand how to use the website, locate their
child's performance, and join a live performance using the
buttons and instructions actually displayed on the website.

Be polite, concise, warm, and easy to understand.
You may reply in English or simple Hinglish depending on
the parent's question.

Never invent a live link, schedule, password, or event detail.
If the required information is not available, ask the parent
to check the website's displayed schedule or contact the school.

Do not ask parents to share passwords or sensitive personal data.
`;

    const apiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: prompt }]
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500
          }
        })
      }
    );

    const result = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Gemini API error:", result);
      return res.status(502).json({
        error: "AI service is temporarily unavailable."
      });
    }

    const reply = result.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "No response received. Please try again."
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Chat server error:", error);
    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sukoon backend running on port ${PORT}`);
});
