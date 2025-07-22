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
    <div className="relative my-40 mb-60 px-0 sm:px-2 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />

      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      <div className="grid grid-cols-2 max-sm:grid-cols-2 md:flex flex-wrap justify-center gap-4">
        {shows
          .filter((movie) => movie && movie._id)
          .map((movie) => (
            <MovieCard movie={movie} key={movie._id} />
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
