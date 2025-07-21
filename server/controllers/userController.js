import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { getOrCreateMovie } from "./showController.js"; // Import the new function

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

    // Validate internalMovieId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(internalMovieId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid movie ID" });
    }

    const user = await clerkClient.users.getUser(userId);

    if (!user.privateMetadata.favorites) {
      user.privateMetadata.favorites = [];
    }

    const mongoUser = await User.findById(userId);
    if (!mongoUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
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
