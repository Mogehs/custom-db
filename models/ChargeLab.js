import mongoose from "mongoose";

const wheelVariantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true },
    range: {
      electric_only_range: Number,
      range: Number,
      range_city: Number,
      range_highway: Number,
      alternative_fuel_economy_city: Number,
      city08: Number,
      alternative_fuel_economy_highway: Number,
      highway08: Number,
      alternative_fuel_economy_combined: Number,
      comb08: Number,
    },
    charging: {
      ac_connector: String,
      charging_rate_level_2: String,
      charging_speed_level_2: String,
      dc_connector: String,
      charging_rate_dc_fast: String,
      charging_speed_dc_fast: String,
    },
  },
  { _id: false }
); // No need for subdocument IDs unless you want them

const chargeLabSchema = new mongoose.Schema({
  vehicle: {
    id: { type: String, required: true, unique: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: String, required: true },
    baseModel: String,
    trim: String,
  },
  powertrain: {
    engine_type: String,
    fuelType: String,
    engine_size: String,
    evMotor: String,
    driveTrain: String,
    drive: String,
    category: String,
  },
  battery: {
    battery_voltage: Number,
    battery_capacity_amp_hours: Number,
    battery_capacity_kwh: Number,
    battery_type: String,
  },
  wheels: [wheelVariantSchema],
  picture: String,
});

chargeLabSchema.index(
  { "vehicle.make": 1, "vehicle.model": 1, "vehicle.year": 1 },
  { unique: true }
);

const ChargeLab = mongoose.model("ChargeLab", chargeLabSchema);

export default ChargeLab;
