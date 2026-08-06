import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/user_actions/auth";
import asyncErrorHandler from "../middlewares/helpers/asyncErrorHandler";
import ErrorHandler from "../utils/errorHandler";
import Holding from "../models/holdingModel";

/**
 * GET /api/holdings
 * Auth required — returns the authenticated user's metal holdings
 * shaped for the dashboard portfolio UI.
 */
export const getHoldings = asyncErrorHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      // Should never reach here — isAuthenticatedUser middleware guards this
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const holding = await Holding.findOne({ userId: req.user._id });

    if (!holding) {
      // No holding record yet — return zeroed portfolio so the UI renders cleanly
      return res.status(200).json({
        success: true,
        data: {
          gold: { amountGrams: 0, updatedAt: null },
          silver: { amountGrams: 0, updatedAt: null },
          platinum: { amountGrams: 0, updatedAt: null },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        gold: {
          amountGrams: holding.gold.amountGrams,
          updatedAt: holding.gold.updatedAt,
        },
        silver: {
          amountGrams: holding.silver.amountGrams,
          updatedAt: holding.silver.updatedAt,
        },
        platinum: {
          amountGrams: holding.platinum.amountGrams,
          updatedAt: holding.platinum.updatedAt,
        },
      },
    });
  }
);
