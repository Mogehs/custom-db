import express from "express";
import {
  fetchAndAddFuelVehicles,
  getChargeLabsVehicles,
} from "../controllers/chargeLabs.controller.js";

const router = express.Router();

router.get("/vehicles", getChargeLabsVehicles);
router.get("/fuel-economy", fetchAndAddFuelVehicles);

export default router;
