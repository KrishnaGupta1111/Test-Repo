import express from "express";
import {
  getFavorites,
  getUserBookings,
  updateFavorite,
  getRecommendations,
} from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";

const userRouter = express.Router();

userRouter.get("/bookings", requireAuth(), getUserBookings);
userRouter.post("/update-favorite", requireAuth(), updateFavorite);
userRouter.get("/favorites", requireAuth(), getFavorites);
userRouter.get("/recommendations", requireAuth(), getRecommendations);

export default userRouter;
