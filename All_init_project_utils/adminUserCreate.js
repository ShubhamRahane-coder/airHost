import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/user.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const adminData = {
  username: "admin",
  email: "adminShubh@email.com",
  password: "Admin@123",
  role: "admin",
};

const existingAdmin = await User.findOne({ email: adminData.email });

if (existingAdmin) {
  // update password and role in case admin exists
  existingAdmin.password = await bcrypt.hash(adminData.password, 12);
  existingAdmin.role = "admin";
  await existingAdmin.save();
  console.log("✅ Admin updated successfully");
  process.exit();
}

const hashedPassword = await bcrypt.hash(adminData.password, 12);

const admin = new User({
  username: adminData.username,
  email: adminData.email,
  password: hashedPassword,
  role: "admin",
});

await admin.save();
console.log("✅ Admin created successfully");
process.exit();
