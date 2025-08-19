import mongoose from "mongoose";
export function connectToDatabase() {
  const dbURI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/chargeLabs";
  return mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}
