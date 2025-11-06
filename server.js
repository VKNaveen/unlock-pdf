const express = require("express");
const multer = require("multer");
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.post("/unlock-pdf", upload.single("file"), async (req, res) => {
  try {
    const passwords = JSON.parse(req.body.passwords || "[]");
    const fileBuffer = req.file.buffer;

    // Try each password with PDFtk
    for (let i = 0; i < passwords.length; i++) {
      const pw = passwords[i];
      
      const result = await tryUnlockPDF(fileBuffer, pw);
      if (result.success) {
        console.log(`Unlocked with password: ${pw}`);
        const base64 = result.data.toString("base64");
        return res.json({ status: "unlocked", data: base64 });
      }
    }

    console.log("Failed to unlock");
    return res.json({ status: "locked" });

  } catch (err) {
    console.error("Unlock error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

async function tryUnlockPDF(fileBuffer, password) {
  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, 'temp');
    fs.ensureDirSync(tempDir);
    
    const inputFile = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.pdf`);
    
    try {
      fs.writeFileSync(inputFile, fileBuffer);
      
      const pdftk = 'C:\\Program Files (x86)\\PDFtk\\bin\\pdftk.exe';
      const command = `"${pdftk}" "${inputFile}" input_pw ${password} output "${outputFile}"`;
      

      
      exec(command, (error, stdout, stderr) => {
        try {
          if (!error && fs.existsSync(outputFile)) {
            const unlockedData = fs.readFileSync(outputFile);
            fs.removeSync(inputFile);
            fs.removeSync(outputFile);
            resolve({ success: true, data: unlockedData });
          } else {
            fs.removeSync(inputFile);
            if (fs.existsSync(outputFile)) fs.removeSync(outputFile);
            resolve({ success: false });
          }
        } catch (cleanupError) {
          resolve({ success: false });
        }
      });
    } catch (err) {
      resolve({ success: false });
    }
  });
}

const PORT = 4000;
app.listen(PORT, () => console.log(`PDF unlock server running on port ${PORT}`));
