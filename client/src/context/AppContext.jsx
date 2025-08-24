import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

  const { user } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const fetchIsAdmin = async () => {
    try {
      const { data } = await axios.get("/api/admin/is-admin", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      setIsAdmin(data.isAdmin);

      if (!data.isAdmin && location.pathname.startsWith("/admin")) {
        navigate("/");
        toast.error("You are not authorized to access admin dashboard");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");
      if (data.success) {
        setShows(data.shows);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteMovies = async () => {
    try {
      const { data } = await axios.get("/api/user/favorites", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setFavoriteMovies(data.movies);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Add this function to handle favorite/unfavorite
  const toggleFavorite = async (movieId) => {
    try {
      const { data } = await axios.post(
        "/api/user/update-favorite",
        { movieId },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      if (data.success) {
        fetchFavoriteMovies(); // Refresh favorites after update
        toast.success("Favorite updated!");
      } else {
        toast.error(data.message || "Failed to update favorite");
      }
    } catch (error) {
      toast.error("Failed to update favorite");
    }
  };

  // Fetch recommended movies for the user with small retry/backoff
  const fetchRecommendedMovies = async () => {
    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const { data } = await axios.get("/api/user/recommendations", {
          headers: { Authorization: `Bearer ${await getToken()}` },
          timeout: 9000,
        });
        if (data.success) return data.recommendedMovies;
        // Non-success but 200
        attempt++;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      } catch (err) {
        attempt++;
        // brief backoff then retry
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    toast.error("Could not fetch recommendations. Showing popular shows instead.");
    // Fallback to shows already in context
    return shows.slice(0, 5);
  };

  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (user) {
      fetchIsAdmin();
      fetchFavoriteMovies();
    }
  }, [user]);

  useEffect(() => {
    // Debug: Log Clerk session token to console
    (async () => {
      const token = await getToken();
      console.log("Clerk session token:", token);
    })();
  }, [user, getToken]);

  const value = {
    axios,
    fetchIsAdmin,
    user,
    getToken,
    navigate,
    isAdmin,
    shows,
    setShows,
    favoriteMovies,
    fetchFavoriteMovies,
    image_base_url,
    toggleFavorite, // Add this to context
    fetchRecommendedMovies,
    setLoading,
    loading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
