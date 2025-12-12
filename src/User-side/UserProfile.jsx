// UserProfile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function UserProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    position: "",
    department: "",
    contact: "",
    address: "",
    profileImageUrl: "",
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    const user = JSON.parse(stored);

    setProfile((prev) => ({
      ...prev,
      name: user.fullName || prev.name,
      email: user.email || prev.email,
      position: user.position || prev.position,
      department: user.department || prev.department,
    }));

    const fetchProfile = async () => {
      try {
        if (!user.employeeId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("employees")
          .select("contact, address, profile_image_url")
          .eq("id", user.employeeId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile((prev) => ({
            ...prev,
            contact: data.contact || "",
            address: data.address || "",
            profileImageUrl: data.profile_image_url || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        alert("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, GIF, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }

    const stored = sessionStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    const user = JSON.parse(stored);
    if (!user.employeeId) {
      alert("Employee ID not found");
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.employeeId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("Uploading to:", filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Upload failed: " + uploadError.message);
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log("Public URL:", publicUrl);

      // Update database
      const { error: updateError } = await supabase
        .from("employees")
        .update({ profile_image_url: publicUrl })
        .eq("id", user.employeeId);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error("Database update failed: " + updateError.message);
      }

      // Update local state
      setProfile((prev) => ({
        ...prev,
        profileImageUrl: publicUrl,
      }));

      // Update sessionStorage
      sessionStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          profileImageUrl: publicUrl,
        })
      );

      alert("Profile picture updated successfully!");
    } catch (err) {
      console.error("Error uploading avatar:", err);
      alert("Failed to upload profile picture: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const stored = sessionStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    const user = JSON.parse(stored);

    try {
      // Note: email is NOT updated here anymore
      const { error } = await supabase
        .from("employees")
        .update({
          full_name: profile.name,
          position: profile.position,
          department: profile.department,
          contact: profile.contact,
          address: profile.address,
        })
        .eq("id", user.employeeId);

      if (error) throw error;

      sessionStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          fullName: profile.name,
          position: profile.position,
          department: profile.department,
        })
      );

      alert("Profile updated successfully!");
      navigate("/dashboard_user");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="bg-white border-2 border-yellow-300 rounded-2xl px-6 py-4 shadow">
          <p className="text-green-800 font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4 py-8">
      <div className="relative max-w-xl w-full">
        {/* subtle top accent */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-green-600 rounded-full blur-xl opacity-30 pointer-events-none" />

        <div className="bg-white border border-yellow-300 shadow-xl rounded-3xl px-8 py-8 sm:px-10 sm:py-10 relative z-10">
          {/* Avatar + title */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden shadow-inner border-4 border-green-600/80">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-green-800">👤</span>
              )}
            </div>

            <label className="mt-3 text-xs font-semibold text-green-700 cursor-pointer">
              <span className="underline decoration-dotted">
                {uploading ? "Uploading..." : "Change picture"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>

            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-green-800">
              My Profile
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 text-center max-w-sm">
              View and update your personal information to keep your employee
              records accurate.
            </p>
          </div>

          {/* Info cards wrapper */}
          <div className="space-y-6">
            {/* Basic details card */}
            <div className="bg-green-50/70 border border-green-100 rounded-2xl px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-green-800 mb-3">
                Personal Details
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg px-3 py-2 bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    name="email"
                    value={profile.email}
                    readOnly
                    className="w-full rounded-lg px-3 py-2 bg-gray-100 border border-gray-300 text-gray-600 text-sm cursor-not-allowed"
                    title="Email cannot be changed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be modified
                  </p>
                </div>
              </div>
            </div>

            {/* Job details card */}
            <div className="bg-yellow-50/80 border border-yellow-200 rounded-2xl px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-green-800 mb-3">
                Job Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Department
                  </label>
                  <input
                    name="department"
                    value={profile.department}
                    onChange={handleInputChange}
                    className="w-full rounded-lg px-3 py-2 bg-white border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Role / Position
                  </label>
                  <input
                    name="position"
                    value={profile.position}
                    onChange={handleInputChange}
                    className="w-full rounded-lg px-3 py-2 bg-white border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Contact card */}
            <div className="bg-white border border-green-100 rounded-2xl px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-green-800 mb-3">
                Contact Details
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Contact
                  </label>
                  <input
                    name="contact"
                    value={profile.contact}
                    onChange={handleInputChange}
                    className="w-full rounded-lg px-3 py-2 bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Address
                  </label>
                  <input
                    name="address"
                    value={profile.address}
                    onChange={handleInputChange}
                    className="w-full rounded-lg px-3 py-2 bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full sm:w-1/2 bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm shadow hover:bg-green-600 hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard_user")}
              className="w-full sm:w-1/2 bg-white border-2 border-gray-900 text-gray-900 py-2.5 rounded-lg font-bold text-sm hover:bg-yellow-100 hover:text-green-900 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
