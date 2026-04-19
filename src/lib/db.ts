import mongoose from "mongoose";

declare global {
  var __mongooseConn: typeof mongoose | undefined;
}

export async function connectDb() {
  if (global.__mongooseConn) return global.__mongooseConn;
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGO_URI in environment.");
  }
  const conn = await mongoose.connect(mongoUri, {
    dbName: "truetrustbuy",
  });
  global.__mongooseConn = conn;
  return conn;
}
