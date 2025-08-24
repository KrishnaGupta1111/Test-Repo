import { Star, StarIcon, Heart, HeartIcon } from "lucide-react";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import timeFormat from "../lib/timeFormat";
import { useAppContext } from "../context/AppContext";

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { image_base_url, favoriteMovies, toggleFavorite, user } =
    useAppContext();

  // Force hasShow true for all movies in the Movies (Now Showing) page
  const hasShow =
    location.pathname === "/movies"
      ? true
      : movie.hasShow !== undefined
        ? movie.hasShow
        : false;

  // Safe derived values to avoid runtime crashes in prod
  const year = movie?.release_date
    ? new Date(movie.release_date).getFullYear()
    : "—";
  const genresText = Array.isArray(movie?.genres)
    ? movie.genres
        .slice(0, 2)
        .map((g) => g?.name)
        .filter(Boolean)
        .join(" | ")
    : "";
  const runtimeText =
    typeof movie?.runtime === "number" && movie.runtime > 0
      ? timeFormat(movie.runtime)
      : "—";

  return (
    <div className="flex flex-col justify-between p-3 bg-gray-800 rounded-2xl shadow-md hover:-translate-y-0.5 transition duration-300 w-full h-full overflow-hidden border border-gray-700">
      <img
        onClick={() => {
          navigate(`/movies/${movie._id}`);
          scrollTo(0, 0);
        }}
        src={image_base_url + movie.backdrop_path}
        alt=""
        className="rounded-xl w-full aspect-[3/4] object-cover object-center cursor-pointer bg-black"
      />

      <p className="font-semibold mt-2 truncate text-base sm:text-lg">
        {movie.title}
      </p>

      <p className="text-xs text-gray-400 mt-1 mb-2">
        {year}
        {genresText ? ` • ${genresText}` : ""}
        {runtimeText !== "—" ? ` • ${runtimeText}` : ""}
      </p>

      <div className="flex items-center justify-between mt-auto pt-2 pb-1">
        {hasShow ? (
          <button
            onClick={() => {
              navigate(`/movies/${movie._id}`);
              scrollTo(0, 0);
            }}
            className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
          >
            Book Ticket
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2 text-xs bg-gray-600 text-gray-300 rounded-full font-medium cursor-not-allowed opacity-70"
            title="Coming Soon"
          >
            Coming Soon
          </button>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!user) return;
              toggleFavorite(movie._id);
            }}
            className="focus:outline-none"
            title={
              favoriteMovies.some((fav) => fav._id === movie._id)
                ? "Remove from favorites"
                : "Add to favorites"
            }
          >
            {favoriteMovies.some((fav) => fav._id === movie._id) ? (
              <HeartIcon className="w-5 h-5 text-red-500 fill-red-500" />
            ) : (
              <Heart className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <span className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
            <StarIcon className="w-4 h-4 text-primary fill-primary" />
            {movie.vote_average ? Number(movie.vote_average).toFixed(1) : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
