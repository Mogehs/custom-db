import express from "express";

import { connectToDatabase } from "./utils/db.js";
import { configDotenv } from "dotenv";

import injectData from "./utils/inject-data.js";
import { getFuelDataCronService } from "./routes/fuelSync.routes.js";

import chargeLabsRoutes from "./routes/chrageLabs.routes.js";
import fuelSyncRoutes from "./routes/fuelSync.routes.js";

const app = express();
app.use(express.json());
configDotenv();

app.get("/inject-data", async (req, res) => {
  try {
    await injectData();
    res.status(200).send("Data injected successfully");
  } catch (error) {
    console.error("Error injecting data:", error);
    res.status(500).send("Error injecting data");
  }
});

// Routes
app.use("/api/charge-labs", chargeLabsRoutes);
app.use("/api/fuel-sync", fuelSyncRoutes);

app.listen(3000, () => {
  connectToDatabase()
    .then(() => {
      console.log("Database connection established");

      // Start the fuel data cron service automatically
      // Runs daily at 2 AM UTC by default
      const fuelDataCronService = getFuelDataCronService();
      fuelDataCronService.start("0 2 * * *", {
        startId: 0,
        endId: 49130,
      });

      console.log("🚀 Fuel data synchronization service started");
      console.log("🕒 Scheduled to run daily at 2:00 AM UTC");
      console.log("💾 Uses bulk insert (no batching) for optimal performance");
      console.log(
        "🎯 Automatically runs data injection after fuel sync completion"
      );
      console.log("📡 Use /api/fuel-sync endpoints to manage the service");
    })
    .catch((error) => {
      console.error("Database connection error:", error);
    });
  console.log("Server is running on port 3000");
});
