// route.ts
import { connectToDatabase, User } from "../../../lib/mongoose-client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { user_id, password } = await req.json();

    await connectToDatabase();

    // 1. Find the user, but INCLUDE the password field for comparison
    // NEW: Requests both password and account_type
    const user = await User.findOne({ user_id: user_id }).select({ 
        user_id: 1,      // ⬅️ Add user_id
        name: 1,         // ⬅️ Add name
        email: 1,        // ⬅️ Add email (if needed)
        age: 1,          // ⬅️ Add age (if needed)
        hobbies: 1,      // ⬅️ Add hobbies (if needed)
        account_type: 1, // ⬅️ Add account_type
        password: 1      // ⬅️ Keep password for comparison
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // NOTE: For real apps, use a library like 'bcrypt' to securely compare hashed passwords
    if (user.password !== password) {
      return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });
    }

    // 2. Prepare a sanitized user object for the client
    const sanitizedUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      age: user.age,
      hobbies: user.hobbies,
      // 🛑 CRITICAL: ADD ACCOUNT_TYPE HERE
      account_type: user.account_type, 
      // Do NOT include user.password
    };

    // NOTE: You must ensure your 'User' Mongoose model schema (users.ts) now includes an 'account_type' field.

    return NextResponse.json({ 
        success: true, 
        message: "Login successful", 
        user: sanitizedUser // Return the safe, filtered object
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}