import express from "express";
import { productAnalytics } from "../controllers/analytics.controller";
import { authorizeRoles, isAuthenticated } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/product", isAuthenticated, authorizeRoles("admin"), productAnalytics);

export default router;
