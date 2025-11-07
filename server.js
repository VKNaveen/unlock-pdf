const express = require("express");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const { execFile } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// If qpdf is installed in a custom path on Windows, set:
// set QPDF_PATH="C:\Program Files\qpdf\bin\qpdf.exe"
const QPDF_PATH = (process.env.QPDF_PATH || "qpdf").replace(/^"(.*)"$/, "$1");


app.post("/unlock-pdf", upload.single("file"), async (req, res) => {
  const requestId = Date.now();
  console.log(`[${requestId}] Request started`);

  try {
    const passwords = JSON.parse(req.body.passwords || "[]");
    const fileBuffer = req.file.buffer;

    for (let i = 0; i < passwords.length; i++) {
      const pw = passwords[i];
      const result = await tryUnlockPDF(fileBuffer, pw);

      if (result.success) {
        console.log(`[${requestId}] Unlocked with password: ${pw}`);
        const base64 = result.data.toString("base64");
        return res.json({ status: "unlocked", data: base64 });
      }
    }

    console.log(`[${requestId}] Failed to unlock`);
    return res.json({ status: "locked" });

  } catch (err) {
    console.error(`[${requestId}] Unlock error:`, err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

async function tryUnlockPDF(fileBuffer, password) {
  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, "temp");
    fs.ensureDirSync(tempDir);

    const inputFile = path.join(tempDir, `input_${Date.now()}.pdf`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.pdf`);

    try {
      fs.writeFileSync(inputFile, fileBuffer);

      const args = [
        `--password=${password}`,
        "--decrypt",
        inputFile,
        outputFile
      ];

      execFile(QPDF_PATH, args, { windowsHide: true }, (error, stdout, stderr) => {
        console.log("QPDF:", QPDF_PATH, args.join(" "));
        if (stderr) console.log("QPDF STDERR:", stderr);

        try {
          if (!error && fs.existsSync(outputFile)) {
            const unlocked = fs.readFileSync(outputFile);
            fs.removeSync(inputFile);
            fs.removeSync(outputFile);
            return resolve({ success: true, data: unlocked });
          } else {
            fs.removeSync(inputFile);
            if (fs.existsSync(outputFile)) fs.removeSync(outputFile);
            return resolve({ success: false });
          }
        } catch {
          return resolve({ success: false });
        }
      });
    } catch {
      return resolve({ success: false });
    }
  });
}

const PORT = 4000;
app.listen(PORT, () => console.log(`PDF unlock server running on port ${PORT}`));

