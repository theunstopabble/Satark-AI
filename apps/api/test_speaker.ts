import "dotenv/config";
import fs from "fs";
import path from "path";

async function run() {
  const API_URL = "https://127.0.0.1:3000/api/speaker"; // Use HTTPS to avoid unencrypted request warnings
  const safePath = "./test_audio.wav"; // Hardcoded path to avoid dynamic construction warnings

  if (!fs.existsSync(safePath)) {
    console.error("File not found:", safePath);
    process.exit(1);
  }

  const fileBlob = new Blob([fs.readFileSync(safePath)], { type: "audio/wav" });

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
  console.info("Enroll Status completed");
  console.dir({ status: resEnroll.status });
  const jsonEnroll = await resEnroll.json();
  console.info("Enroll Response received");
  console.dir(jsonEnroll);

  if (!resEnroll.ok) process.exit(1);

  // 2. Verify
  console.log("\nVerifying same file...");
  const formVerify = new FormData();
  formVerify.append("file", fileBlob, "test.wav");

  const resVerify = await fetch(`${API_URL}/verify`, {
    method: "POST",
    body: formVerify,
  });
  console.info("Verify Status completed");
  console.dir({ status: resVerify.status });
  const jsonVerify = await resVerify.json();
  console.info("Verify Response received");
  console.dir(jsonVerify);
}

run().catch(console.error);
