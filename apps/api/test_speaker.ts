import "dotenv/config";
import fs from "fs";
import path from "path";

async function run() {
  const API_URL = "http://127.0.0.1:3000/api/speaker";
  const filePath = path.join(__dirname, "test_audio.wav");

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const fileBlob = new Blob([fs.readFileSync(filePath)], { type: "audio/wav" });

  // 1. Enroll
  console.log("Enrolling 'Test User'...");
  const formData = new FormData();
  formData.append("file", fileBlob, "test.wav");
  formData.append("name", "Test User");
  formData.append("userId", "user_123");

  const resEnroll = await fetch(`${API_URL}/enroll`, {
    method: "POST",
    body: formData,
  });
  console.log("Enroll Status:", resEnroll.status);
  const jsonEnroll = await resEnroll.json();
  console.log("Enroll Response:", jsonEnroll);

  if (!resEnroll.ok) process.exit(1);

  // 2. Verify
  console.log("\nVerifying same file...");
  const formVerify = new FormData();
  formVerify.append("file", fileBlob, "test.wav");

  const resVerify = await fetch(`${API_URL}/verify`, {
    method: "POST",
    body: formVerify,
  });
  console.log("Verify Status:", resVerify.status);
  const jsonVerify = await resVerify.json();
  console.log("Verify Response:", jsonVerify);
}

run().catch(console.error);
