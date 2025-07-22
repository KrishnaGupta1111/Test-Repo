import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { getOrCreateMovie } from "./showController.js"; // Import the new function
import axios from "axios";
import Show from "../models/Show.js";

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
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function getNowPlayingMovieIds() {
  const now = Date.now();
  if (
    nowPlayingCache.ids &&
    now - nowPlayingCache.timestamp < CACHE_DURATION_MS
  ) {
    return nowPlayingCache.ids;
  }
  let nowPlayingIds = new Set();
  let page = 1;
  let totalPages = 1;
  const pagePromises = [];
  // First, get total pages
  const { data: firstPage } = await axios.get(
    "https://api.themoviedb.org/3/movie/now_playing",
    {
      params: {
        api_key: process.env.TMDB_API_KEY_V3,
        page: 1,
      },
    }
  );
  totalPages = firstPage.total_pages;
  pagePromises.push(Promise.resolve(firstPage));
  for (let p = 2; p <= totalPages; p++) {
    pagePromises.push(
      axios
        .get("https://api.themoviedb.org/3/movie/now_playing", {
          params: {
            api_key: process.env.TMDB_API_KEY_V3,
            page: p,
          },
        })
        .then((res) => res.data)
    );
  }
  const allPages = await Promise.all(pagePromises);
  allPages.forEach((pageData) => {
    pageData.results.forEach((movie) => nowPlayingIds.add(movie.id));
  });
  nowPlayingCache = { ids: nowPlayingIds, timestamp: now };
  return nowPlayingIds;
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

    // Fetch recommendations from TMDB for each favorite/booked movie in parallel
    const recResults = await Promise.all(
      userMovieIds.map((movieId) =>
        axios
          .get(
            `https://api.themoviedb.org/3/movie/${movieId}/recommendations`,
            {
              params: { api_key: process.env.TMDB_API_KEY_V3 },
            }
          )
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
    res.status(500).json({ success: false, message: error.message });
  }
};
