import React, { useEffect } from "react";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { useAppContext } from "../context/AppContext";
import axios from "axios";

const Movies = () => {
  const { shows, setShows, setLoading } = useAppContext();

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const { data } = await axios.get("/api/show/all");
        setShows(data.shows || []);
      } catch {
        setShows([]);
      }
      setLoading(false);
    };
    fetchShows();
  }, [axios]);

  return shows?.length > 0 ? (
    <div className="relative my-24 md:my-32 px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24 overflow-hidden min-h-[70vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      <h1 className="text-lg font-medium mt-2 mb-4">Now Showing</h1>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6 lg:gap-8 place-items-stretch">
        {shows
          .filter((movie) => movie && movie._id)
          .map((movie) => (
            <div key={movie._id} className="w-full min-w-0">
              <MovieCard movie={movie} />
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

export default Movies;
