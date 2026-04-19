import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { UserModel } from "../src/lib/models/User";

async function main() {
  const uri = process.env.MONGO_URI;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!uri || !email || !password) {
    throw new Error("Required: MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD");
  }

  await mongoose.connect(uri, { dbName: "truetrustbuy" });

  const exists = await UserModel.findOne({ email: email.toLowerCase().trim() })
    .select("email")
    .lean<{ email: string } | null>();
  if (exists) {
    console.log("Admin already exists:", exists.email);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await hash(password, 12);
  await UserModel.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "admin",
    name,
  });

  console.log("Admin user created.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
