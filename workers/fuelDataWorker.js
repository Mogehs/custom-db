import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import axios from "axios";
import mongoose from "mongoose";
import { parseStringPromise } from "xml2js";
import Fuel from "../models/Fuel.js";
import injectData from "../utils/inject-data.js";
import { configDotenv } from "dotenv";

// Load environment variables
configDotenv();

const fetchVehicleData = async (id) => {
  try {
    const response = await axios.get(
      `${process.env.GET_FUEL_VEHICLES_API_URL}/${id}`,
      {
        headers: {
          Accept: "application/xml, text/xml, application/json",
        },
        timeout: 10000, // 10 second timeout
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
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Worker: Connected to MongoDB");

    const bulkData = [];
    const startId = workerData?.startId || 0;
    const endId = workerData?.endId || 49130;

    console.log(`Worker: Starting fetch from ID ${startId} to ${endId}`);

    for (let id = startId; id <= endId; id++) {
      const vehicleData = await fetchVehicleData(id);

      if (vehicleData && vehicleData.vehicle) {
        // Extract the vehicle data and flatten it to JSON format
        const vehicleJson = vehicleData.vehicle;

        // Convert arrays with single values to just the value
        Object.keys(vehicleJson).forEach((key) => {
          if (
            Array.isArray(vehicleJson[key]) &&
            vehicleJson[key].length === 1
          ) {
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
          `Worker: Fetched vehicle ID ${id} - ${vehicleJson.make} ${vehicleJson.model} ${vehicleJson.year}`
        );

        // Send progress update to main thread
        if (parentPort) {
          parentPort.postMessage({
            type: "progress",
            current: id,
            total: endId,
            vehicleInfo: `${vehicleJson.make} ${vehicleJson.model} ${vehicleJson.year}`,
          });
        }
      } else {
        console.log(`Worker: No data found for vehicle ID ${id}`);
      }

      // Add a small delay to prevent overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Insert all collected data at once
    if (bulkData.length > 0) {
      try {
        await Fuel.insertMany(bulkData, { ordered: false });
        console.log(
          `Worker: Inserted all ${bulkData.length} vehicles successfully.`
        );

        if (parentPort) {
          parentPort.postMessage({
            type: "bulk_inserted",
            totalCount: bulkData.length,
            range: { startId, endId },
          });
        }
      } catch (insertError) {
        console.error(
          "Worker: Error inserting bulk data:",
          insertError.message
        );
      }
    } else {
      console.log("Worker: No vehicles to insert.");
    }

    console.log("Worker: All data fetched and stored.");

    // Run inject-data function after successful fuel data insertion
    console.log("Worker: Starting data injection process...");
    try {
      await injectData();
      console.log("Worker: Data injection completed successfully.");

      if (parentPort) {
        parentPort.postMessage({
          type: "injection_completed",
          message: "Data injection process completed successfully",
        });
      }
    } catch (injectionError) {
      console.error(
        "Worker: Error during data injection:",
        injectionError.message
      );

      if (parentPort) {
        parentPort.postMessage({
          type: "injection_error",
          error: injectionError.message,
        });
      }
    }

    if (parentPort) {
      parentPort.postMessage({
        type: "completed",
        message: "All data fetched, stored, and injected successfully",
      });
    }
  } catch (error) {
    console.error("Worker: Fatal error:", error);

    if (parentPort) {
      parentPort.postMessage({
        type: "error",
        error: error.message,
      });
    }
  } finally {
    // Close mongoose connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("Worker: MongoDB connection closed");
    }
  }
};

// If this is the worker thread, run the function
if (!isMainThread) {
  fetchAndStoreVehicles().catch((error) => {
    console.error("Worker thread error:", error);
    process.exit(1);
  });
}

export default fetchAndStoreVehicles;
