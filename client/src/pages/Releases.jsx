import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

const Releases = () => {
  const { axios, image_base_url } = useAppContext();
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const { data } = await axios.get("/api/tmdb/upcoming");
        setUpcoming(data.results || []);
      } catch (error) {
        setUpcoming([]);
      }
      setLoading(false);
    };
    fetchUpcoming();
  }, []);

  if (loading) return <div className="text-center my-20">Loading...</div>;

  return (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 min-h-[80vh]">
      <h1 className="text-lg font-medium my-4">Upcoming Releases</h1>
      <div className="flex flex-wrap gap-8 justify-center">
        {upcoming.map((movie) => (
          <div
            key={movie.id}
            className="flex flex-col items-center bg-gray-800 rounded-2xl p-3 w-66"
            style={{ maxWidth: 260 }}
          >
            <img
              src={image_base_url + movie.poster_path}
              alt={movie.title}
              className="rounded-lg mx-auto object-contain"
              style={{
                height: "210px",
                width: "auto",
                maxWidth: "100%",
                background: "#111",
              }}
            />
            <p
              className="font-semibold mt-2 truncate text-center w-full"
              title={movie.title}
              style={{ maxWidth: 220 }}
            >
              {movie.title}
            </p>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Release Date: {movie.release_date}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Releases;
