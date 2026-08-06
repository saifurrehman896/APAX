import express, { Router } from "express";
import { getHoldings } from "../controllers/holdingsController";
import { isAuthenticatedUser } from "../middlewares/user_actions/auth";

const router: Router = express.Router();

// GET /api/holdings — auth required
router.get("/", isAuthenticatedUser, getHoldings);

export default router;
