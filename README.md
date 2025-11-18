# PDF Unlock Server

A Node.js server to unlock password-protected PDFs using pdf-lib npm package, compatible with AWS Lambda and Google Apps Script integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will run on port 4000.

## Usage

### For Local Development
- Update the `apiUrl` in your Apps Script to: `http://localhost:4000/unlock-pdf`

### For Production
- **Express Server**: Deploy to cloud platforms (Heroku, Railway, etc.)
- **AWS Lambda**: Use `lambda.js` for serverless deployment
- Update the `apiUrl` in your Apps Script to your deployed server URL

## API Endpoint

**POST** `/unlock-pdf`

- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: PDF file (binary)
  - `passwords`: JSON array of passwords to try

**Response**:
```json
{
  "status": "unlocked|already_unlocked|locked|error",
  "data": "base64_encoded_pdf_data" // only when status is "unlocked"
}
```

## Apps Script Integration

Replace the `tryUnlockWithPDFServer` function in your Apps Script with `tryUnlockWithNodeServer` as provided in `appscript.js`.