import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import { useState } from "react";
import { Heart, PlayCircleIcon, StarIcon } from "lucide-react";
import timeFormat from "../lib/timeFormat";
import DateSelect from "../components/DateSelect";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import ReactPlayer from "react-player";

const MovieDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [show, setShow] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);

  const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
    image_base_url,
  } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleFavorite = async () => {
    try {
      if (!user) return toast.error("Please login to proceed");

      const { data } = await axios.post(
        "/api/user/update-favorite",
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (data.success) {
        await fetchFavoriteMovies();
        toast.success(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Helper to fetch trailer from backend proxy
  const pickBestYoutube = (results = []) => {
    const onlyYT = results.filter((v) => v.site === "YouTube" && v.key);
    const byType = (t) => onlyYT.find((v) => v.type === t);
    return (
      byType("Trailer") ||
      byType("Teaser") ||
      byType("Clip") ||
      onlyYT[0] ||
      null
    );
  };

  const fetchTrailerUrl = async (tmdbId) => {
    try {
      setTrailerLoading(true);
      setTrailerUrl(null);
      const { data } = await axios.get(`/api/tmdb/movie/${tmdbId}/videos`, {
        timeout: 9000,
      });
      const chosen = pickBestYoutube(data?.results || []);
      setTrailerUrl(chosen ? `https://www.youtube.com/watch?v=${chosen.key}` : null);
    } catch {
      setTrailerUrl(null);
    } finally {
      setTrailerLoading(false);
    }
  };

  useEffect(() => {
    getShow();
  }, [id]);

  return show ? (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      {/* Trailer Modal */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-2">
          <div className="relative w-full max-w-2xl mx-auto bg-black rounded-none md:rounded-2xl shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-2 right-2 z-10 bg-gray-800 text-white rounded-full px-3 py-1 text-lg md:top-4 md:right-4"
            >
              ✕
            </button>
            {trailerLoading ? (
              <div className="flex items-center justify-center h-60 md:h-96 text-white text-lg">
                Loading trailer...
              </div>
            ) : trailerUrl ? (
              <div className="w-full aspect-video max-h-[60vh] md:max-h-[70vh] flex items-center justify-center">
                <ReactPlayer
                  url={trailerUrl}
                  controls
                  playing
                  width="100%"
                  height="100%"
                  className="rounded-none md:rounded-xl overflow-hidden"
                  style={{ maxHeight: "70vh", width: "100%" }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-60 md:h-96 text-white text-lg">
                Trailer not available
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        <img
          src={image_base_url + show.movie.poster_path}
          alt=""
          className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
        />
        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />
          <p className="text-primary">ENGLISH</p>
          <h1 className="text-4xl font-semibold max-w-96 text-balance">
            {show.movie.title}
          </h1>
          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {Number(show.movie.vote_average).toFixed(1)} User Rating
          </div>

          <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
            {show.movie.overview}
          </p>
          <p>
            {timeFormat(show.movie.runtime)} •{" "}
            {show.movie.genres.map((genre) => genre.name).join(" , ")} •{" "}
            {show.movie.release_date.split("-")[0]}
          </p>

          <div className="flex flex-row flex-wrap items-center gap-2 mt-4">
            <button
              className="flex items-center gap-1 px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95"
              onClick={() => {
                setShowTrailer(true);
                fetchTrailerUrl(show.movie._id);
              }}
            >
              <PlayCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Watch Trailer</span>
              <span className="inline xs:hidden">Trailer</span>
            </button>
            <a
              href="#dateSelect"
              className="px-4 py-2 text-xs sm:px-7 sm:py-3 sm:text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
            >
              <span className="hidden xs:inline">Buy Tickets</span>
              <span className="inline xs:hidden">Buy Tickets</span>
            </a>
            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2 rounded-full transition cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 ${favoriteMovies.find((movie) => movie._id === id) ? "fill-primary text-primary" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      <p className="text-lg font-medium mt-20">Your Favorite Cast</p>
      <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
        <div className="flex items-center gap-4 w-max px-4">
          {show.movie.casts.slice(0, 12).map((cast, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <img
                src={image_base_url + cast.profile_path}
                alt=""
                className="rounded-full h-20 md:h-20 aspect-square object-cover"
              />
              <p className="font-medium text-xs mt-3">{cast.name}</p>
            </div>
          ))}
        </div>
      </div>

      <DateSelect dateTime={show.dateTime} id={id} />

      <p className="text-lg font-medium mt-20 mb-8">You May Also Like</p>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6 lg:gap-8">
        {shows.slice(0, 8).map((movie, index) => (
          <div key={index} className="w-full min-w-0">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-20">
        <button
          onClick={() => {
            navigate("/movies");
            scrollTo(0, 0);
          }}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
        >
          Show More
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default MovieDetails;
