import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";

const LoadingSkeleton = () => (
  <div className="flex flex-wrap gap-8 justify-center mt-8">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="w-66 h-96 bg-gray-700 rounded-2xl animate-pulse"
      />
    ))}
  </div>
);

const Recommended = () => {
  const { fetchRecommendedMovies } = useAppContext();
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const movies = await fetchRecommendedMovies();
      setRecommended(movies);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  if (loading)
    return (
      <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 min-h-[80vh]">
        <BlurCircle top="150px" left="0px" />
        <BlurCircle bottom="50px" right="50px" />
        <h1 className="text-lg font-medium my-4">Recommended For You</h1>
        <LoadingSkeleton />
      </div>
    );

  return recommended.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">Recommended For You</h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {recommended.map((movie) =>
          movie && movie._id ? (
            <div key={movie._id} className="flex flex-col items-center">
              <MovieCard movie={movie} />
              <span className="text-xs text-gray-400 mt-2 italic">
                Because you liked similar movies
              </span>
            </div>
          ) : null
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">
        No Recommendations Available
      </h1>
    </div>
  );
};

export default Recommended;
