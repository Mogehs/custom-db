import axios from "axios";
import Fuel from "../models/Fuel.js";
import {
  addToChargeLabs,
  updateIfExistsInChargeLabs,
} from "../controllers/chargeLabs.controller.js";

async function injectData() {
  try {
    const vehiclesData = await axios.get(process.env.GET_VEHICLES_API_URL);
    await addToChargeLabs(vehiclesData.data.result);
  } catch (e) {
    console.error(e);
  }

  try {
    const vehiclesData = await Fuel.find();

    await updateIfExistsInChargeLabs(vehiclesData);
  } catch (err) {
    console.error("Failed to fetch data from MongoDB", err);
  }
}

export default injectData;
