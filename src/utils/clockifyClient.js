import { getAuth } from "firebase/auth";
import { supabase } from "../supabaseClient"; // adjust path if different

export async function clockifyClockIn() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase.functions.invoke(
    "clockify-attendance",
    {
      body: {
        action: "clockIn",
        firebaseUid: user.uid,
      },
    }
  );

  if (error) throw error;
  return data;
}

export async function clockifyClockOut() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase.functions.invoke(
    "clockify-attendance",
    {
      body: {
        action: "clockOut",
        firebaseUid: user.uid,
      },
    }
  );

  if (error) throw error;
  return data;
}

