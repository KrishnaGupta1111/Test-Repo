import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import timeFormat from "../lib/timeFormat";

const HeroSlider = () => {
  const navigate = useNavigate();
  const { shows, image_base_url, loading } = useAppContext();

  // Only use the first 4-5 movies with active shows
  const featured = Array.isArray(shows) ? shows.slice(0, 5) : [];

  if (loading || featured.length === 0) {
    return (
      <div className="flex items-center justify-center h-[80vh] w-full bg-black/80">
        <span className="text-lg text-gray-300">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] md:h-[85vh] w-full">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop
        className="h-full custom-swiper-nav"
      >
        {featured.map((item, idx) => {
          // Support both shapes: { movie: {...} } or movie fields on root
          const movie = item?.movie ?? item ?? {};
          const id = movie?._id || item?._id || idx;

          const title = movie?.title || "";
          const year = movie?.release_date
            ? new Date(movie.release_date).getFullYear()
            : "";
          const genresText = Array.isArray(movie?.genres)
            ? movie.genres.map((g) => g?.name).filter(Boolean).join(" | ")
            : "";
          const runtimeText = timeFormat(movie?.runtime);
          const metaParts = [year, genresText, runtimeText].filter(Boolean);
          const bgPath = movie?.backdrop_path || movie?.poster_path || "";
          const overview = movie?.overview || "";

          return (
            <SwiperSlide key={id}>
              <div
                className="flex flex-col items-center md:items-start gap-3 px-3 pt-10 pb-6 md:gap-4 md:px-16 lg:px-36 h-[60vh] md:h-[85vh] bg-cover overflow-visible transition-all duration-500 text-center md:text-left justify-end md:justify-center"
                style={{
                  backgroundImage: `linear-gradient(rgba(20,20,20,0.7),rgba(20,20,20,0.7)), url('${image_base_url + bgPath}')`,
                  backgroundPosition:
                    typeof window !== "undefined" && window.innerWidth < 768
                      ? "center 20%"
                      : "top",
                  backgroundSize: "cover",
                }}
              >
                <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-[70px] md:leading-18 font-semibold w-full max-w-full md:max-w-110 mt-4 md:mt-20 mb-2 whitespace-normal break-words">
                  {title}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-4 text-gray-300 text-xs sm:text-base md:text-lg font-medium w-full">
                  {metaParts.length > 0 && <span>{metaParts.join(" • ")}</span>}
                </div>
                <p className="max-w-xs sm:max-w-md md:max-w-md text-gray-300 whitespace-normal break-words text-xs sm:text-base md:text-base mt-2 md:mt-4">
                  {overview}
                </p>
                <button
                  onClick={() => {
                    const targetId = movie?._id || item?._id;
                    if (targetId) navigate(`/movies/${targetId}`);
                    scrollTo(0, 0);
                  }}
                  className="flex items-center justify-center gap-1 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer text-white mt-4 md:mt-6 w-full max-w-[200px]"
                >
                  Book Now
                </button>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
      {/* Custom Swiper navigation styles */}
      <style>{`
        .custom-swiper-nav .swiper-button-next,
        .custom-swiper-nav .swiper-button-prev {
          background: transparent !important;
          color: #fff !important;
          border: none !important;
          border-radius: 0;
          width: auto;
          height: auto;
          top: 50%;
          transform: translateY(-50%);
          transition: color 0.2s;
          box-shadow: none;
        }
        .custom-swiper-nav .swiper-button-next:hover,
        .custom-swiper-nav .swiper-button-prev:hover,
        .custom-swiper-nav .swiper-button-next:active,
        .custom-swiper-nav .swiper-button-prev:active {
          color: #F84565 !important;
          background: transparent !important;
        }
        .custom-swiper-nav .swiper-button-next:after,
        .custom-swiper-nav .swiper-button-prev:after {
          font-size: 32px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default HeroSlider;
