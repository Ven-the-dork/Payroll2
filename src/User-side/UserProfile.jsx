// UserProfile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { User, Mail, Briefcase, Phone, MapPin, Camera, ArrowLeft, Save } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-green-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard_user")}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-green-700 font-medium transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 overflow-hidden border border-gray-100">
          {/* Header Banner */}
          <div className="relative h-32 bg-gradient-to-r from-green-600 to-green-500">
            <div className="absolute -bottom-16 left-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-white p-1.5 shadow-xl">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-gray-100">
                    {profile.profileImageUrl ? (
                      <img
                        src={profile.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Camera Button */}
                <label className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-lg shadow-lg cursor-pointer transition-colors group">
                  {uploading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Camera size={20} className="group-hover:scale-110 transition-transform" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Profile Info Section */}
          <div className="pt-20 px-8 pb-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">{profile.name || "Your Name"}</h1>
              <p className="text-gray-500 mt-1">{profile.position} • {profile.department}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <User size={18} className="text-green-700" />
                  </div>
                  Personal Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Full Name
                    </label>
                    <input
                      name="name"
                      value={profile.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Mail size={18} className="text-gray-400" />
                      </div>
                      <input
                        name="email"
                        value={profile.email}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                        title="Email cannot be changed"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Email cannot be modified</p>
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-100 rounded-lg">
                    <Briefcase size={18} className="text-yellow-700" />
                  </div>
                  Job Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Department
                    </label>
                    <input
                      name="department"
                      value={profile.department}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      placeholder="e.g., Human Resources"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Position
                    </label>
                    <input
                      name="position"
                      value={profile.position}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                      placeholder="e.g., Manager"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Phone size={18} className="text-blue-700" />
                  </div>
                  Contact Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Phone size={18} className="text-gray-400" />
                      </div>
                      <input
                        name="contact"
                        value={profile.contact}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                        placeholder="+63 900 000 0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Address
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <MapPin size={18} className="text-gray-400" />
                      </div>
                      <input
                        name="address"
                        value={profile.address}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                        placeholder="123 Main Street, City"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white py-3 px-6 rounded-xl font-bold shadow-lg shadow-green-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Save Changes
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate("/dashboard_user")}
                  className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-6 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            © 2025 CVSU. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
