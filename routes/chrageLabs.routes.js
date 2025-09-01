import express from "express";
import {
  fetchAndAddFuelVehicles,
  getChargeLabsVehicles,
  getVehicle,
} from "../controllers/chargeLabs.controller.js";

const router = express.Router();

router.get("/vehicles", getChargeLabsVehicles);
router.get("/vehicle/:id", getVehicle);
router.get("/fuel-economy", fetchAndAddFuelVehicles);

export default router;
