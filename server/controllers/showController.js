import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

// Reusable function to get a movie from DB or create it from TMDB
export const getOrCreateMovie = async (movieId) => {
  let movie = await Movie.findById(movieId);

  if (!movie) {
    // If movieId is not a valid ObjectId, it's likely a TMDB ID
    // Let's try to find it by the _id which we are setting as TMDB ID
    movie = await Movie.findOne({ _id: movieId });
  }

  if (!movie) {
    // Fetch from TMDB
    const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      }),
      axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      }),
    ]);

    const movieApiData = movieDetailsResponse.data;
    const movieCreditsData = movieCreditsResponse.data;

    const movieDetails = {
      _id: movieApiData.id.toString(), // Ensure _id is a string
      title: movieApiData.title,
      overview: movieApiData.overview,
      poster_path: movieApiData.poster_path,
      backdrop_path: movieApiData.backdrop_path,
      genres: movieApiData.genres,
      casts: movieCreditsData.cast,
      release_date: movieApiData.release_date,
      original_language: movieApiData.original_language,
      tagline: movieApiData.tagline || "",
      vote_average: movieApiData.vote_average,
      runtime: movieApiData.runtime,
    };

    movie = await Movie.create(movieDetails);
  }
  return movie;
};

export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      }
    );

    const movies = data.results;
    res.json({ success: true, movies: movies });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API TO ADD A NEW SHOW TO THE DATABASE

export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    const movie = await getOrCreateMovie(movieId);

    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movie._id,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    //trigger inngest event
    await inngest.send({
      name: "app/show.added",
      data: { movieTitle: movie.title },
    });

    res.json({ success: true, message: "Show Added successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get all shows from the database

export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // Unique movies with at least one active show
    const movieMap = new Map();
    shows.forEach((show) => {
      if (show.movie && !movieMap.has(show.movie._id.toString())) {
        movieMap.set(show.movie._id.toString(), {
          ...(show.movie.toObject?.() || show.movie),
          hasShow: true,
        });
      }
    });

    res.json({ success: true, shows: Array.from(movieMap.values()) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get a single show from the database

export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });
    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
