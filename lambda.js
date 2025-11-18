const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lambda layer path for qpdf binary
const QPDF_PATH = process.env.QPDF_PATH || '/opt/bin/qpdf';

exports.handler = async (event) => {
  try {
    const { file, passwords } = JSON.parse(event.body);
    const fileBuffer = Buffer.from(file, 'base64');
    const passwordList = JSON.parse(passwords || '[]');

    for (const password of passwordList) {
      const result = await tryUnlockPDF(fileBuffer, password);
      
      if (result.success) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'unlocked', 
            data: result.data.toString('base64') 
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'locked' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: error.message })
    };
  }
};

async function tryUnlockPDF(fileBuffer, password) {
  return new Promise((resolve) => {
    const inputFile = path.join('/tmp', `input_${Date.now()}.pdf`);
    const outputFile = path.join('/tmp', `output_${Date.now()}.pdf`);

    try {
      fs.writeFileSync(inputFile, fileBuffer);

      const args = [
        `--password=${password}`,
        '--decrypt',
        inputFile,
        outputFile
      ];

      execFile(QPDF_PATH, args, (error, stdout, stderr) => {
        console.log('QPDF:', QPDF_PATH, args.join(' '));
        if (stderr) console.log('QPDF STDERR:', stderr);

        try {
          if (!error && fs.existsSync(outputFile)) {
            const unlocked = fs.readFileSync(outputFile);
            fs.unlinkSync(inputFile);
            fs.unlinkSync(outputFile);
            return resolve({ success: true, data: unlocked });
          } else {
            if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
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