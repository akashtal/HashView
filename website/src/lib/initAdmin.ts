import connectDB from "./db";
import Admin from "@/models/Admin";

const DEFAULT_ADMIN = {
  username: "admin",
  email: "admin@hashview.com",
  password: "Admin@123",
};

export async function initializeDefaultAdmin() {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN.email });

    if (!existingAdmin) {
      // Create default admin
      const admin = new Admin(DEFAULT_ADMIN);
      await admin.save();
      console.log("✅ Default admin user created:", DEFAULT_ADMIN.email);
    } else {
      console.log("ℹ️  Admin user already exists:", DEFAULT_ADMIN.email);
    }
  } catch (error) {
    console.error("❌ Error initializing default admin:", error);
  }
}

