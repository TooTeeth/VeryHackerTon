"use client";

import { useState, ChangeEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { toast } from "react-toastify";
import { uploadGameImage } from "../../lib/uploadGameImage";
import CreateButton from "./CreateButton";
import Image from "next/image";

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ScheduleType = "monthly" | "weekly" | "daily" | "custom";

export default function CreateStreamModal({ isOpen, onClose, onSuccess }: CreateStreamModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    era: "",
    customEra: "",
    genre: "",
    customGenre: "",
    playersType: "Unlimited",
    playersLimit: "",
    planType: "Free",
    planFee: "",
    scheduleType: "weekly" as ScheduleType,
    monthlyWeek: "1",
    monthlyDay: "Monday",
    monthlyTime: "00:00",
    weeklyDay: "Monday",
    weeklyTime: "00:00",
    dailyTime: "00:00",
    customSchedule: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatSchedule = (): string => {
    const { scheduleType, monthlyWeek, monthlyDay, monthlyTime, weeklyDay, weeklyTime, dailyTime, customSchedule } = formData;

    switch (scheduleType) {
      case "monthly":
        return `Every ${monthlyWeek}${getOrdinalSuffix(parseInt(monthlyWeek))} ${monthlyDay} at ${monthlyTime}`;
      case "weekly":
        return `Every ${weeklyDay} at ${weeklyTime}`;
      case "daily":
        return `Every day at ${dailyTime}`;
      case "custom":
        return customSchedule;
      default:
        return "";
    }
  };

  const getOrdinalSuffix = (num: number): string => {
    if (num > 3 && num < 21) return "th";
    switch (num % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const handleCreate = async (data: { Title: string; Players: number; Era: string; Genre: string; Plan: number }) => {
    if (!imageFile) {
      toast.error("Please upload a stream image");
      return;
    }

    try {
      const imageUrl = await uploadGameImage(imageFile);
      if (!imageUrl) {
        toast.error("Image upload failed");
        return;
      }

      const streamData = {
        ...data,
        Schedule: formatSchedule(),
        Image: imageUrl,
      };

      const { error } = await supabase.from("Stream").insert([streamData]);

      if (error) {
        console.error("Stream creation error:", error);
        toast.error("Failed to create stream");
        return;
      }

      toast.success("Stream created successfully! 🎉");

      setFormData({
        title: "",
        era: "",
        customEra: "",
        genre: "",
        customGenre: "",
        playersType: "Unlimited",
        playersLimit: "",
        planType: "Free",
        planFee: "",
        scheduleType: "weekly",
        monthlyWeek: "1",
        monthlyDay: "Monday",
        monthlyTime: "00:00",
        weeklyDay: "Monday",
        weeklyTime: "00:00",
        dailyTime: "00:00",
        customSchedule: "",
      });
      setImageFile(null);
      setImagePreview("");

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-8 py-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Create a Stream</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl" disabled={isSubmitting}>
            ×
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter stream title" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition" required />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Era <span className="text-red-500">*</span>
            </label>
            <select name="era" value={formData.era} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition" required>
              <option value="">Select era</option>
              <option value="MiddleAge">MiddleAge</option>
              <option value="Cyberpunk">Cyberpunk</option>
              <option value="Modern">Modern</option>
              <option value="Others">Others</option>
            </select>
            {formData.era === "Others" && <input type="text" name="customEra" value={formData.customEra} onChange={handleInputChange} placeholder="Enter custom era" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition mt-2" required />}
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Genre <span className="text-red-500">*</span>
            </label>
            <select name="genre" value={formData.genre} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition" required>
              <option value="">Select genre</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Action">Action</option>
              <option value="Romance">Romance</option>
              <option value="Others">Others</option>
            </select>
            {formData.genre === "Others" && <input type="text" name="customGenre" value={formData.customGenre} onChange={handleInputChange} placeholder="Enter custom genre" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition mt-2" required />}
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Players <span className="text-red-500">*</span>
            </label>
            <select name="playersType" value={formData.playersType} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition">
              <option value="Unlimited">Unlimited (∞)</option>
              <option value="Limited">Limited</option>
            </select>
            {formData.playersType === "Limited" && <input type="number" name="playersLimit" value={formData.playersLimit} onChange={handleInputChange} placeholder="Enter number of players" min="1" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition mt-2" required />}
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Plan <span className="text-red-500">*</span>
            </label>
            <select name="planType" value={formData.planType} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition">
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
            {formData.planType === "Paid" && <input type="number" name="planFee" value={formData.planFee} onChange={handleInputChange} placeholder="Enter fee amount" min="0" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition mt-2" required />}
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Schedule <span className="text-red-500">*</span>
            </label>
            <select name="scheduleType" value={formData.scheduleType} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition">
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="custom">Custom</option>
            </select>

            {formData.scheduleType === "monthly" && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <select name="monthlyWeek" value={formData.monthlyWeek} onChange={handleInputChange} className="px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition">
                  <option value="1">1st Week</option>
                  <option value="2">2nd Week</option>
                  <option value="3">3rd Week</option>
                  <option value="4">4th Week</option>
                </select>
                <select name="monthlyDay" value={formData.monthlyDay} onChange={handleInputChange} className="px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input type="time" name="monthlyTime" value={formData.monthlyTime} onChange={handleInputChange} className="px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition" />
              </div>
            )}

            {formData.scheduleType === "weekly" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <select name="weeklyDay" value={formData.weeklyDay} onChange={handleInputChange} className="px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input type="time" name="weeklyTime" value={formData.weeklyTime} onChange={handleInputChange} className="px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition" />
              </div>
            )}

            {formData.scheduleType === "daily" && <input type="time" name="dailyTime" value={formData.dailyTime} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition mt-3" />}

            {formData.scheduleType === "custom" && <input type="text" name="customSchedule" value={formData.customSchedule} onChange={handleInputChange} placeholder="Enter custom schedule" className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition mt-3" required />}
          </div>

          <div>
            <label className="block text-white font-medium mb-2">
              Stream Image <span className="text-red-500">*</span>
            </label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer" />
            {imagePreview && (
              <div className="relative w-full h-[40rem] rounded-lg overflow-hidden">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-3 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium">
              Cancel
            </button>
            <div className="flex-1">
              <CreateButton
                data={{
                  Title: formData.title,
                  Players: formData.playersType === "Unlimited" ? 0 : parseInt(formData.playersLimit) || 0,
                  Era: formData.era === "Others" ? formData.customEra : formData.era,
                  Genre: formData.genre === "Others" ? formData.customGenre : formData.genre,
                  Plan: formData.planType === "Free" ? 0 : parseInt(formData.planFee) || 0,
                }}
                onCreate={handleCreate}
                disabled={!imageFile || isSubmitting}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
