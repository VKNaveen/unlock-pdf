const express = require("express");
const multer = require("multer");
const muhammara = require("muhammara");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// Unlock PDF endpoint
app.post("/unlock-pdf", upload.single("file"), async (req, res) => {
  const requestId = Date.now();
  console.log(`[${requestId}] Request started`);

  try {
    const passwords = JSON.parse(req.body.passwords || "[]");
    const fileBuffer = req.file.buffer;

    console.log(`[${requestId}] Passwords to try:`, passwords);

    for (const password of passwords) {
      console.log(`[${requestId}] Trying password: ${password}`);

      const result = await tryUnlockPDF(fileBuffer, password, requestId);
      if (result.success) {
        console.log(`[${requestId}] Unlocked with password: ${password}`);
        const base64 = result.data.toString("base64");
        return res.json({ status: "unlocked", data: base64 });
      }
    }

    console.log(`[${requestId}] All passwords failed`);
    return res.json({ status: "locked" });

  } catch (err) {
    console.error(`[${requestId}] Unlock error:`, err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

async function tryUnlockPDF(fileBuffer, password, requestId) {
  const inputPath = path.join(os.tmpdir(), `${requestId}_${Date.now()}_input.pdf`);
  const outputPath = path.join(os.tmpdir(), `${requestId}_${Date.now()}_output.pdf`);

  let pdfReader = null;
  let pdfWriter = null;

  try {
    fs.writeFileSync(inputPath, fileBuffer);
    pdfReader = muhammara.createReader(inputPath, { password });

    pdfWriter = muhammara.createWriter(outputPath);
    const copyContext = pdfWriter.createPDFCopyingContext(pdfReader);
    const pageCount = pdfReader.getPagesCount();

    for (let i = 0; i < pageCount; i++) {
      copyContext.appendPDFPageFromPDF(i);
    }

    pdfWriter.end();
    pdfWriter = null; // Mark as closed

    const unlockedBuffer = fs.readFileSync(outputPath);

    return { success: true, data: unlockedBuffer };

  } catch (error) {
    console.error(`[${requestId}] Password failed: ${password} - ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    try {
      if (pdfWriter) pdfWriter.end();
    } catch (e) {}
    
    // Wait a bit before cleanup to avoid file locks
    setTimeout(() => {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {
        console.log(`[${requestId}] Cleanup warning:`, e.message);
      }
    }, 100);
  }
}

const PORT = 4000;
app.listen(PORT, () => console.log(`PDF unlock server running on port ${PORT}`));