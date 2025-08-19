import express from "express";

import { connectToDatabase } from "./utils/db.js";
import { configDotenv } from "dotenv";

import injectData from "./utils/inject-data.js";

import chargeLabsRoutes from "./routes/chrageLabs.routes.js";

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

app.use("/api/charge-labs", chargeLabsRoutes);

app.listen(3000, () => {
  connectToDatabase()
    .then(() => {
      console.log("Database connection established");
    })
    .catch((error) => {
      console.error("Database connection error:", error);
    });
  console.log("Server is running on port 3000");
});
