import axios from "axios";
import mongoose from "mongoose";
import { parseStringPromise } from "xml2js";
import Fuel from "../models/Fuel.js";

const fetchVehicleData = async (id) => {
  try {
    const response = await axios.get(
      `${process.env.GET_FUEL_VEHICLES_API_URL}/${id}`,
      {
        headers: {
          Accept: "application/xml, text/xml, application/json",
        },
      }
    );

    const data = response.data;

    if (typeof data === "string") {
      if (data.trim().startsWith("<")) {
        return await parseStringPromise(data);
      } else if (data.trim().startsWith("[") || data.trim().startsWith("{")) {
        return JSON.parse(data);
      }
    } else if (typeof data === "object") {
      return { vehicle: data };
    }

    return await parseStringPromise(data);
  } catch (error) {
    console.error(`Error fetching vehicle ID ${id}:`, error.message);
    return null;
  }
};

const fetchAndStoreVehicles = async () => {
  const bulkData = [];
  for (let id = 0; id <= 49130; id++) {
    const vehicleData = await fetchVehicleData(id);
    if (vehicleData && vehicleData.vehicle) {
      // Extract the vehicle data and flatten it to JSON format
      const vehicleJson = vehicleData.vehicle;

      // Convert arrays with single values to just the value
      Object.keys(vehicleJson).forEach((key) => {
        if (Array.isArray(vehicleJson[key]) && vehicleJson[key].length === 1) {
          vehicleJson[key] = vehicleJson[key][0];
        } else if (
          Array.isArray(vehicleJson[key]) &&
          vehicleJson[key].length === 0
        ) {
          vehicleJson[key] = null;
        }
      });

      bulkData.push(vehicleJson);
      console.log(
        `Fetched vehicle ID ${id} - ${vehicleJson.make} ${vehicleJson.model} ${vehicleJson.year}`
      );
    } else {
      console.log(`No data found for vehicle ID ${id}`);
    }

    // Insert in batches of 100 to avoid performance issues
    if (bulkData.length >= 100) {
      await Fuel.insertMany(bulkData);
      console.log(`Inserted batch up to ID ${id}`);
      bulkData.length = 0; // Clear the batch
    }
  }

  // Insert remaining data
  if (bulkData.length > 0) {
    await Fuel.insertMany(bulkData);
    console.log("Inserted final batch.");
  }

  console.log("All data fetched and stored.");
  mongoose.connection.close();
};

export default fetchAndStoreVehicles;
