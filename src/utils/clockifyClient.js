import { getAuth } from "firebase/auth";
import { supabase } from "../supabaseClient";

// Small helper to ensure we always have a user
function getCurrentUserOrThrow() {
  const auth = getAuth();
  const user = auth.currentUser;
  console.log("Firebase currentUser:", user?.uid); // debug
  if (!user) {
    throw new Error("Not logged in");
  }
  return user;
}

// Call when user clicks "Clock In"
export async function clockifyClockIn() {
  const user = getCurrentUserOrThrow();

  const { data, error } = await supabase.functions.invoke(
    "clockify-attendance",
    {
      body: {
        action: "clockIn",
        firebaseUid: user.uid,
      },
      // method: "POST", // POST is default
    }
  );

  if (error) {
    console.error("Clock In error:", error);
    throw error;
  }

  return data;
}

// Call when user clicks "Clock Out"
export async function clockifyClockOut() {
  const user = getCurrentUserOrThrow();

  const { data, error } = await supabase.functions.invoke(
    "clockify-attendance",
    {
      body: {
        action: "clockOut",
        firebaseUid: user.uid,
      },
      // method: "POST", // POST is default
    }
  );

  if (error) {
    console.error("Clock Out error:", error);
    throw error;
  }

  return data;
}
