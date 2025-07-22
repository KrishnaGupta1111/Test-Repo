import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import axios from "axios";
import { getOrCreateMovie } from "./showController.js";

export const isAdmin = async (req, res) => {
  res.json({ success: true, isAdmin: true });
};

//API to get dashboard data
export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });
    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    }).populate("movie");

    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get all shows

export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });
    res.json({ success: true, shows });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get all bookings

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user")
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const fetchBollywoodMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/discover/movie",
      {
        params: {
          api_key: process.env.TMDB_API_KEY_V3, // Use v3 key here
          with_original_language: "hi",
          sort_by: "popularity.desc",
          page: 1, // You can loop through more pages if you want more movies
        },
      }
    );

    for (const movie of data.results) {
      await getOrCreateMovie(movie.id);
    }

    res.json({ success: true, message: "Bollywood movies fetched and added!" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
