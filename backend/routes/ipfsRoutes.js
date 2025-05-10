const express = require("express");
const multer = require("multer");
const {
  uploadFileToIPFS,
  downloadEncryptedFileFromIPFS,
} = require("../controllers/ipfsController");
const router = express.Router();

const storage = multer.memoryStorage(); // Store in memory (not filesystem)
const upload = multer({ storage });

router.post("/upload", upload.single("file"), uploadFileToIPFS);
router.get("/download", downloadEncryptedFileFromIPFS);

module.exports = router;
