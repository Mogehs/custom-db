import mongoose from "mongoose";

const fuelSchema = new mongoose.Schema({}, { strict: false });

const Fuel = mongoose.model("Fuel", fuelSchema);

export default Fuel;
