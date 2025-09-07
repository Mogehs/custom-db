import express from "express";
import {
  fetchAndAddFuelVehicles,
  getChargeLabsVehicles,
  getChargeLabsVehiclesByQuery,
  getVehicle,
} from "../controllers/chargeLabs.controller.js";

const router = express.Router();

router.get("/vehicles/all", getChargeLabsVehicles);
router.get("/vehicle/:id", getVehicle);
router.get("/vehicles", getChargeLabsVehiclesByQuery);

router.get("/fuel-economy", fetchAndAddFuelVehicles);

export default router;
