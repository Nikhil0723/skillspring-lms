import { NextFunction, Request, Response } from "express";
import { getProductAnalytics } from "../services/productAnalytics.service";

export const productAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requestedDays = Number(req.query.days ?? 30);
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const analytics = await getProductAnalytics(days);
    res.status(200).json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
};
