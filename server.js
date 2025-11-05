const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post("/unlock-pdf", upload.single("file"), async (req, res) => {
  try {
    const passwords = JSON.parse(req.body.passwords || "[]");
    const fileBuffer = req.file.buffer;

    // Try loading without password first
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: false });
      console.log("PDF is already unlocked.");
      return res.json({ status: "already_unlocked" });
    } catch (e) {
      // proceed to password attempts
    }

    for (let pw of passwords) {
      try {
        const pdfDoc = await PDFDocument.load(fileBuffer, { password: pw });
        const unlockedBytes = await pdfDoc.save();
        console.log(`Unlocked successfully with password: ${pw}`);
        const base64 = unlockedBytes.toString("base64");
        return res.json({ status: "unlocked", data: base64 });
      } catch (err) {
        // wrong password, try next
      }
    }

    console.log("Failed to unlock with provided passwords.");
    return res.json({ status: "locked" });

  } catch (err) {
    console.error("Unlock error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`PDF unlock server running on port ${PORT}`));
