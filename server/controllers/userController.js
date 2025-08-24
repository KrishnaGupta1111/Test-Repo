import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { getOrCreateMovie } from "./showController.js"; // Import the new function
import axios from "axios";
import Show from "../models/Show.js";
import Redis from "ioredis";

// Optional Redis client for caching
let redis;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    redis.on("error", (e) => console.warn("Redis error:", e.message));
  }
} catch (e) {
  console.warn("Failed to init Redis:", e.message);
}

// Simple in-memory fallback cache helpers
const memoryCache = new Map(); // key -> { value, expiresAt }
const getFromCache = async (key) => {
  try {
    if (redis) {
      const val = await redis.get(key);
      if (val) return JSON.parse(val);
    } else if (memoryCache.has(key)) {
      const entry = memoryCache.get(key);
      if (Date.now() < entry.expiresAt) return entry.value;
      memoryCache.delete(key);
    }
  } catch {}
  return null;
};
const setInCache = async (key, value, ttlSeconds = 600) => {
  try {
    if (redis) await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    else memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  } catch {}
};

//API Controller Function to Get User Bookings
export const getUserBookings = async (req, res) => {
  try {
    const user = req.auth().userId;

    const bookings = await Booking.find({ user })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

//API Controller Function to Add Favorite Movie in Clerk User Metadata

export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.auth().userId;

    // Ensure the movie exists in our DB and get its internal _id
    const movie = await getOrCreateMovie(movieId);
    const internalMovieId = movie._id;

    const user = await clerkClient.users.getUser(userId);

    if (!user.privateMetadata.favorites) {
      user.privateMetadata.favorites = [];
    }

    let mongoUser = await User.findById(userId);
    if (!mongoUser) {
      // Auto-create user in MongoDB if not found
      mongoUser = await User.create({
        _id: userId,
        name: user.firstName + " " + user.lastName,
        email: user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
        favorites: [],
      });
    }

    let updatedFavorites;
    const isFavorite = mongoUser.favorites.includes(internalMovieId);

    if (!isFavorite) {
      // Add to favorites
      user.privateMetadata.favorites.push(internalMovieId.toString());
      await User.findByIdAndUpdate(userId, {
        $addToSet: { favorites: internalMovieId },
      });
      updatedFavorites = user.privateMetadata.favorites;
    } else {
      // Remove from favorites
      user.privateMetadata.favorites = user.privateMetadata.favorites.filter(
        (item) => item !== internalMovieId.toString()
      );
      await User.findByIdAndUpdate(userId, {
        $pull: { favorites: internalMovieId },
      });
      updatedFavorites = user.privateMetadata.favorites;
    }

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: user.privateMetadata,
    });

    res.json({
      success: true,
      message: "Favorite Movie Updated",
      favorites: updatedFavorites,
    });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getFavorites = async (req, res) => {
  try {
    const userId = req.auth().userId;
    // Fetch favorites from MongoDB User document
    const mongoUser = await User.findById(userId);
    const favorites = mongoUser?.favorites || [];
    const movies = await Movie.find({ _id: { $in: favorites } });
    res.json({ success: true, movies });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// In-memory cache for now playing movie IDs
let nowPlayingCache = { ids: null, timestamp: 0 };
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes (fallback only)

async function getNowPlayingMovieIds() {
  // Try Redis/memory cache first
  const cacheKey = "tmdb:now_playing_ids:v1";
  const cached = await getFromCache(cacheKey);
  if (cached) return new Set(cached);

  const now = Date.now();
  if (nowPlayingCache.ids && now - nowPlayingCache.timestamp < CACHE_DURATION_MS) {
    return nowPlayingCache.ids;
  }
  try {
    const nowPlayingIds = new Set();
    // Reduce API load: only fetch first N pages
    const MAX_PAGES = 3;
    const req = (page) =>
      axios.get("https://api.themoviedb.org/3/movie/now_playing", {
        params: { api_key: process.env.TMDB_API_KEY_V3, page },
        timeout: 8000,
      });
    const first = await req(1).then((r) => r.data);
    const totalPages = Math.min(first.total_pages || 1, MAX_PAGES);
    const others = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => req(i + 2).then((r) => r.data)).map((p) =>
        p.catch(() => ({ results: [] }))
      )
    );
    [first, ...others].forEach((pageData) => {
      (pageData.results || []).forEach((m) => nowPlayingIds.add(m.id));
    });
    nowPlayingCache = { ids: nowPlayingIds, timestamp: now };
    // Cache for 10 minutes
    await setInCache(cacheKey, Array.from(nowPlayingIds), 600);
    return nowPlayingIds;
  } catch {
    // On any failure, return empty set so flow continues
    return new Set();
  }
}

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found in database." });
    }
    const favoriteIds = user.favorites || [];

    // Fetch bookings and populate show
    const bookings = await Booking.find({ user: userId }).populate({
      path: "show",
      select: "movie",
    });
    // Extract booked movie IDs
    const bookedMovieIds = bookings
      .map((b) => b.show && b.show.movie)
      .filter(Boolean);

    // Combine and deduplicate, limit to 5 for speed
    const userMovieIds = [...new Set([...favoriteIds, ...bookedMovieIds])]
      .slice(0, 5)
      .map((id) => id.toString());

    // If user has no history, fallback directly to active shows (fast path)
    if (userMovieIds.length === 0) {
      const extraShows = await Show.find({ showDateTime: { $gte: new Date() } })
        .populate("movie")
        .limit(10);
      const fallback = [];
      const seen = new Set();
      for (const show of extraShows) {
        const movie = show.movie?.toObject?.() || show.movie;
        if (movie && !seen.has(movie._id?.toString())) {
          seen.add(movie._id?.toString());
          fallback.push({ ...movie, hasShow: true });
        }
        if (fallback.length >= 5) break;
      }
      return res.json({ success: true, recommendedMovies: fallback });
    }

    // Fetch recommendations from TMDB for each favorite/booked movie in parallel
    const recResults = await Promise.all(
      userMovieIds.map((movieId) =>
        axios
          .get(`https://api.themoviedb.org/3/movie/${movieId}/recommendations`, {
            params: { api_key: process.env.TMDB_API_KEY_V3 },
            timeout: 8000,
          })
          .then((res) => res.data.results)
          .catch(() => [])
      )
    );
    let recommendedMovieMap = {};
    recResults.flat().forEach((rec) => {
      if (rec && rec.id) recommendedMovieMap[rec.id] = rec;
    });

    // Remove movies already in user's favorites/bookings
    for (const seenId of userMovieIds) {
      delete recommendedMovieMap[parseInt(seenId)];
    }

    // Get now playing movie IDs from TMDB (cached)
    const nowPlayingIds = await getNowPlayingMovieIds();

    // Filter recommendations to only include now playing movies
    let recommendedMoviesArr = Object.values(recommendedMovieMap)
      .filter((rec) => nowPlayingIds.has(rec.id))
      .slice(0, 5); // Limit to 5 recommendations

    // For each recommended movie, check if it has a show in DB
    let recommendedMovies = await Promise.all(
      recommendedMoviesArr.map(async (rec) => {
        let movie = await Movie.findById(rec.id.toString());
        let hasShow = false;
        if (movie) {
          const show = await Show.findOne({
            movie: movie._id.toString(),
            showDateTime: { $gte: new Date() },
          });
          hasShow = !!show;
        }
        // If not in DB, just use TMDB data and set hasShow false
        return {
          ...(movie ? movie.toObject() : rec),
          hasShow,
        };
      })
    );

    // Ensure at least 2 bookable movies (hasShow === true)
    let bookable = recommendedMovies.filter((m) => m.hasShow);
    let comingSoon = recommendedMovies.filter((m) => !m.hasShow);
    if (bookable.length < 2) {
      // Query DB for more movies with active shows not already in recommendations or user favorites/bookings
      const alreadyRecommendedIds = new Set(
        recommendedMovies.map((m) => m._id?.toString() || m.id?.toString())
      );
      const extraShows = await Show.find({
        showDateTime: { $gte: new Date() },
      }).populate("movie");
      for (const show of extraShows) {
        const movieId =
          show.movie?._id?.toString() || show.movie?.id?.toString();
        if (
          movieId &&
          !alreadyRecommendedIds.has(movieId) &&
          !userMovieIds.includes(movieId)
        ) {
          bookable.push({
            ...(show.movie.toObject?.() || show.movie),
            hasShow: true,
          });
          alreadyRecommendedIds.add(movieId);
          if (bookable.length >= 2) break;
        }
      }
    }

    // Combine bookable and coming soon, limit to 5
    const finalRecommendations = [...bookable, ...comingSoon].slice(0, 5);

    res.json({ success: true, recommendedMovies: finalRecommendations });
  } catch (error) {
    // Last-resort fallback: recommend from active shows to avoid flakiness
    try {
      const shows = await Show.find({ showDateTime: { $gte: new Date() } })
        .populate("movie")
        .limit(10);
      const unique = [];
      const seen = new Set();
      for (const show of shows) {
        const m = show.movie?.toObject?.() || show.movie;
        if (m && !seen.has(m._id?.toString())) {
          seen.add(m._id?.toString());
          unique.push({ ...m, hasShow: true });
        }
        if (unique.length >= 5) break;
      }
      return res.json({ success: true, recommendedMovies: unique });
    } catch (e) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
