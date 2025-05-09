// const axios = require('axios');
// const FormData = require('form-data');
// require('dotenv').config();

// exports.uploadFileToIPFS = async (req, res) => {
//   try {
//     const file = req.file;

//     const formData = new FormData();
//     formData.append('file', file.buffer, file.originalname);

//     const result = await axios.post(
//       'https://api.pinata.cloud/pinning/pinFileToIPFS',
//       formData,
//       {
//         maxBodyLength: 'Infinity',
//         headers: {
//           ...formData.getHeaders(),
//           pinata_api_key: process.env.PINATA_API_KEY,
//           pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY
//         }
//       }
//     );

//     res.status(200).json({ cid: result.data.IpfsHash });
//   } catch (err) {
//     console.error('File Upload Error:', err.message);
//     res.status(500).json({ error: 'Failed to upload file to IPFS' });
//   }
// };



const axios = require('axios');
const FormData = require('form-data');
const CryptoJS = require('crypto-js');
require('dotenv').config();

exports.uploadEncryptedFileToIPFS = async (req, res) => {
  try {
    const file = req.file;
    const encryptionKey = "ABCD"; // Pass secret key via request

    if (!encryptionKey) {
      return res.status(400).json({ error: 'Missing encryption key' });
    }

    // Convert buffer to base64 string
    const base64Data = file.buffer.toString('base64');

    // Encrypt the base64 string
    const encrypted = CryptoJS.AES.encrypt(base64Data, encryptionKey).toString();

    // Convert encrypted text back into a buffer
    const encryptedBuffer = Buffer.from(encrypted, 'utf-8');

    // Prepare FormData for IPFS upload
    const formData = new FormData();
    formData.append('file', encryptedBuffer, `${file.originalname}.enc`);

    const result = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY
        }
      }
    );

    res.status(200).json({
      message: 'Encrypted file uploaded to IPFS',
      cid: result.data.IpfsHash
    });
  } catch (err) {
    console.error('Encrypted upload failed:', err.message);
    res.status(500).json({ error: 'Failed to upload encrypted file' });
  }
};


// controller function
exports.downloadEncryptedFileFromIPFS = async (req, res) => {
    const { cid } = req.query;
    const key="ABCD"
  
    if (!cid) return res.status(400).json({ error: 'CID is required' });
  
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
  
      let fileBuffer = Buffer.from(response.data);
  
      if (key) {
        const encryptedText = fileBuffer.toString('utf-8');
        const decrypted = CryptoJS.AES.decrypt(encryptedText, key).toString(CryptoJS.enc.Utf8);
  
        fileBuffer = Buffer.from(decrypted, 'base64');
      }
  
      res.setHeader('Content-Disposition', `attachment; filename=decrypted-file`);
      res.send(fileBuffer);
    } catch (err) {
      console.error('Download failed:', err.message);
      res.status(500).json({ error: 'Failed to download or decrypt file' });
    }
  };

  
  
