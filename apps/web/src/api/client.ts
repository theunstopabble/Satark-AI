import { AudioUploadType, ScanResultType } from "@repo/shared";
import { useAuth } from "@clerk/clerk-react";

export const useApiClient = () => {
  const { getToken } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const scanAudio = async (data: AudioUploadType): Promise<ScanResultType> => {
    const token = await getToken();

    const response = await fetch(`${API_URL}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to scan audio");
    }

    return response.json();
  };

  const scanUpload = async (
    file: File,
    userId: string,
  ): Promise<ScanResultType> => {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const response = await fetch(`${API_URL}/scan-upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to upload audio");
    }

    return response.json();
  };

  const getHistory = async (userId: string): Promise<ScanResultType[]> => {
    const token = await getToken();
    const response = await fetch(`${API_URL}/scans?userId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch history");
    return response.json();
  };

  return { scanAudio, scanUpload, getHistory };
};
