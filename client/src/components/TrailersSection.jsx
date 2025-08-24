import React, { useEffect, useMemo, useState } from "react";
import BlurCircle from "./BlurCircle";
import ReactPlayer from "react-player";
import { PlayCircleIcon } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const TrailersSection = () => {
  const { shows, axios, image_base_url } = useAppContext();
  const [trailers, setTrailers] = useState([]);
  const [currentTrailer, setCurrentTrailer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const pickBestYoutube = (results = []) => {
    const onlyYT = results.filter((v) => v.site === "YouTube" && v.key);
    const byType = (t) => onlyYT.find((v) => v.type === t);
    return byType("Trailer") || byType("Teaser") || byType("Clip") || onlyYT[0] || null;
  };

  const nowShowingSample = useMemo(() => (shows || []).slice(0, 8), [shows]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!nowShowingSample.length) return;
      setLoading(true);
      try {
        const results = await Promise.all(
          nowShowingSample.map(async (m) => {
            try {
              const { data } = await axios.get(`/api/tmdb/movie/${m._id}/videos`, {
                timeout: 9000,
              });
              const chosen = pickBestYoutube(data?.results || []);
              if (!chosen) return null;
              return {
                id: m._id,
                title: m.title,
                image: image_base_url + (m.backdrop_path || m.poster_path),
                videoUrl: `https://www.youtube.com/watch?v=${chosen.key}`,
              };
            } catch {
              return null;
            }
          })
        );
        const filtered = results.filter(Boolean);
        if (!cancelled) {
          setTrailers(filtered);
          setCurrentTrailer(filtered[0] || null);
          setIsPlaying(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [axios, image_base_url, nowShowingSample]);

  return (
    <div className="px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24 py-12 md:py-20 overflow-hidden">
      <p className="text-gray-300 font-medium text-lg max-w-[960px] mx-auto">
        Trailers
      </p>
      <div className="relative mt-4 md:mt-6">
        <BlurCircle top="-100px" right="-100px" />
        <div className="relative w-full max-w-[960px] aspect-video mx-auto rounded-lg overflow-hidden">
          {currentTrailer && (
            <ReactPlayer
              url={currentTrailer.videoUrl}
              controls
              playing={isPlaying}
              muted={false}
              volume={1}
              playsinline
              config={{ youtube: { playerVars: { modestbranding: 1, rel: 0, fs: 1 } } }}
              width="100%"
              height="100%"
              className="!h-full !w-full"
            />
          )}
          {!currentTrailer && (
            <div className="flex items-center justify-center h-full text-gray-300 text-sm">
              {loading ? "Loading trailers..." : "No trailers available for current shows"}
            </div>
          )}
        </div>
      </div>

      <div className="group grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-5 mt-6 md:mt-8 max-w-5xl mx-auto">
        {trailers.map((tr) => (
          <button
            key={tr.id}
            className="relative group-hover:not-hover:opacity-50 hover:-translate-y-0.5 duration-300 transition aspect-video cursor-pointer rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/60"
            onClick={() => {
              setCurrentTrailer(tr);
              setIsPlaying(true);
            }}
            aria-label={`Play trailer for ${tr.title}`}
          >
            <img
              src={tr.image}
              alt={tr.title}
              className="w-full h-full object-cover brightness-75"
              loading="lazy"
            />
            <PlayCircleIcon
              strokeWidth={1.6}
              className="absolute top-1/2 left-1/2 w-8 h-8 md:w-10 md:h-10 transform -translate-x-1/2 -translate-y-1/2 text-white drop-shadow"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-xs sm:text-sm truncate">
              {tr.title}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrailersSection;
