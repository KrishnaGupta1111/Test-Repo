import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";
import axios from "axios";

const app = express();
const port = process.env.PORT || 3000;

await connectDB();

//Stripe Webhooks Route

app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// Debug test route
app.post("/api/test", (req, res) => {
  res.json({ message: "Test route working!" });
});

//Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["https://cinebookk.vercel.app", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(clerkMiddleware());

//API Routes

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/show", showRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.get("/", (req, res) => res.send("Server is Live!"));

// Proxy endpoint for Bollywood movies
app.get("/api/tmdb/bollywood", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/discover/movie",
      {
        params: {
          api_key: process.env.TMDB_API_KEY_V3,
          with_original_language: "hi",
          sort_by: "popularity.desc",
          page: 1,
        },
      }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for TMDB movie search
app.get("/api/tmdb/search", async (req, res) => {
  try {
    const { query } = req.query;
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: {
          api_key: process.env.TMDB_API_KEY_V3,
          query,
        },
      }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for TMDB upcoming movies
app.get("/api/tmdb/upcoming", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/upcoming",
      {
        params: {
          api_key: process.env.TMDB_API_KEY_V3,
        },
      }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for TMDB movie videos (trailers)
app.get("/api/tmdb/movie/:id/videos", async (req, res) => {
  try {
    const { id } = req.params;
    const apiKey = process.env.TMDB_API_KEY_V3 || process.env.TMDB_API_KEY;
    const { data } = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}/videos`,
      {
        params: {
          api_key: apiKey,
          include_video_language: "en,null",
        },
        timeout: 8000,
      }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () =>
  console.log(`Server listening at http://localhost:${port}`)
);
console.log("Registered routes: /api/stripe (POST), /api/test (POST)");
