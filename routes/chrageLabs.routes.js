import express from "express";
import { getChargeLabsVehicles } from "../controllers/chargeLabs.controller.js";

const router = express.Router();

router.get("/vehicles", getChargeLabsVehicles);

export default router;
