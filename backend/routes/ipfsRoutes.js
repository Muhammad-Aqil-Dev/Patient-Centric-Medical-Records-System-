const express = require('express');
const multer = require('multer');
const { uploadEncryptedFileToIPFS, downloadEncryptedFileFromIPFS } = require('../controllers/ipfsController');
const router = express.Router();
// const { uploadFileToIPFS } = require('../controllers/ipfsController');

const storage = multer.memoryStorage(); // Store in memory (not filesystem)
const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadEncryptedFileToIPFS);
router.get('/download', downloadEncryptedFileFromIPFS);


module.exports = router;
