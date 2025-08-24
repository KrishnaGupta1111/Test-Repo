import React from "react";

import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { useAppContext } from "../context/AppContext";

const Favorite = () => {
  const { favoriteMovies, shows } = useAppContext();

  // Create a Set of movie IDs that have active shows
  const showMovieIds = new Set(shows.map((m) => m._id));

  return favoriteMovies.length > 0 ? (
    <div className="relative my-24 md:my-32 px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24 overflow-hidden min-h-[70vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      <h1 className="text-lg font-medium mt-2 mb-4">Your Favorite Movies</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6 lg:gap-8 place-items-stretch">
        {favoriteMovies.map((movie) => (
          <div key={movie._id} className="w-full min-w-0">
            <MovieCard
              movie={
                showMovieIds.has(movie._id) ? { ...movie, hasShow: true } : movie
              }
            />
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No Movies Available</h1>
    </div>
  );
};

export default Favorite;
