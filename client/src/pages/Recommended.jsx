import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";

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
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  return recommended.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">Recommended For You</h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {recommended.map((movie) => (
          <MovieCard movie={movie} key={movie._id} />
        ))}
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
