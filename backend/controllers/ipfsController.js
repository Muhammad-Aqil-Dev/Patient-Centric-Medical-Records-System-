const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

exports.uploadFileToIPFS = async (req, res) => {
  try {
    const file = req.file;

    const formData = new FormData();
    formData.append("file", file.buffer, file.originalname);

    const result = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      }
    );

    res.status(200).json({ cid: result.data.IpfsHash });
  } catch (err) {
    console.error("File Upload Error:", err.message);
    res.status(500).json({ error: "Failed to upload file to IPFS" });
  }
};

exports.downloadEncryptedFileFromIPFS = async (req, res) => {
  const { cid } = req.query;
  const { filename } = req.query; // Get optional filename from query

  if (!cid) return res.status(400).json({ error: "CID is required" });

  try {
    // Get the file from Pinata
    const response = await axios.get(
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      {
        responseType: "arraybuffer",
      }
    );

    // If filename is provided, use it, otherwise use a default with the CID
    const downloadFilename = filename || `medical-record-${cid}.odt`;

    // Set headers for file download with proper filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadFilename}"`
    );

    // Try to determine content type based on file extension
    const fileExt = downloadFilename.split(".").pop().toLowerCase();
    let contentType = "application/octet-stream"; // Default

    // Set appropriate content type based on file extension
    if (fileExt === "pdf") contentType = "application/pdf";
    else if (fileExt === "doc") contentType = "application/msword";
    else if (fileExt === "docx")
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (fileExt === "odt")
      contentType = "application/vnd.oasis.opendocument.text";
    else if (fileExt === "txt") contentType = "text/plain";

    res.setHeader("Content-Type", contentType);

    // Send the file
    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error("Download failed:", err);
    res.status(500).json({
      error: "Failed to download file from IPFS",
      details: err.message,
    });
  }
};

/* LOCAL STORAGE VERSION - COMMENTED OUT
const CryptoJS = require("crypto-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

exports.uploadEncryptedFileToIPFS = async (req, res) => {
  try {
    const file = req.file;
    const encryptionKey = "ABCD"; // Fixed encryption key for simplicity

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert buffer to base64 string
    const base64Data = file.buffer.toString("base64");

    // Encrypt the base64 string
    const encrypted = CryptoJS.AES.encrypt(
      base64Data,
      encryptionKey
    ).toString();

    // Generate a unique file ID
    const fileId = crypto.randomUUID();

    // Create a metadata object
    const metadata = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      encryptionMethod: "AES",
      uploadDate: new Date().toISOString(),
    };

    // Save the encrypted file locally
    const filePath = path.join(uploadsDir, `${fileId}.enc`);
    fs.writeFileSync(filePath, encrypted);

    // Save metadata
    const metaPath = path.join(uploadsDir, `${fileId}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    // Return the file ID as CID
    return res.status(200).json({
      message: "File encrypted and stored successfully",
      cid: fileId,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return res
      .status(500)
      .json({ error: "Failed to upload encrypted file", details: err.message });
  }
};

exports.downloadEncryptedFileFromIPFS = async (req, res) => {
  const { cid } = req.query;
  const key = "ABCD"; // Fixed encryption key for simplicity

  if (!cid) return res.status(400).json({ error: "CID is required" });

  try {
    // Build paths to the encrypted file and metadata
    const filePath = path.join(uploadsDir, `${cid}.enc`);
    const metaPath = path.join(uploadsDir, `${cid}.json`);

    // Check if files exist
    if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Read the encrypted data and metadata
    const encryptedText = fs.readFileSync(filePath, "utf8");
    const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key).toString(
      CryptoJS.enc.Utf8
    );
    const fileBuffer = Buffer.from(decrypted, "base64");

    // Set the content disposition with original filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${metadata.originalName}`
    );
    if (metadata.mimeType) {
      res.setHeader("Content-Type", metadata.mimeType);
    }

    res.send(fileBuffer);
  } catch (err) {
    console.error("Download failed:", err);
    res.status(500).json({
      error: "Failed to download or decrypt file",
      details: err.message,
    });
  }
};
*/
