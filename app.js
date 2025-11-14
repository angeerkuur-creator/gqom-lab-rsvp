const express = require("express");
const QRCode = require("qrcode");
const cookieParser = require("cookie-parser");
const path = require("path");
const { google } = require("googleapis");

// ---------------------
// Google Sheets Setup
// ---------------------
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = "1eMmt7SGtel2D1MzG5DgfLVcXB_X5Hq_6W8WHx0Y31Oc";

// Function to add data to Google Sheet
async function addToSheet(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          data.firstName,
          data.lastName,
          data.email,
          data.phone,
          data.inviteCode,
          data.coming,
          data.plusOnes,
          new Date().toLocaleString(),
        ],
      ],
    },
  });
}

// ---------------------
const app = express();

// ---------------------
// View Engine Setup
// ---------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------------------
// Middleware
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------
// GET Home Route
// ---------------------
app.get("/", (req, res) => {
  res.render("index");
});

// ---------------------
// POST Submit Route
// ---------------------
app.post("/submit", async (req, res) => {
  const { firstName, lastName, email, phone, inviteCode, coming, plusOnes } =
    req.body;

  const qrData = `Name: ${firstName} ${lastName}, Email: ${email}, Invite: ${inviteCode}`;
  const qrImage = await QRCode.toDataURL(qrData);

  // --- EMAIL SETUP ---
  const nodemailer = require("nodemailer");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "angeer.kuur@strathmore.edu",
      pass: "ogrg tker izoq nspd", // your app password
    },
  });

  // Email content
  const mailOptions = {
    from: "GQOM LAB RSVP <angeer.kuur@strathmore.edu>",
    to: email,
    subject: "Your GQOM LAB RSVP Confirmation",
    html: `
      <h2>You're Confirmed!</h2>
      <p>Thanks for RSVPing. Show the QR code at the entrance.</p>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
    `,
    attachments: [
      {
        filename: "qrcode.png",
        content: qrImage.split(",")[1],
        encoding: "base64",
      },
    ],
  };

  await transporter.sendMail(mailOptions);

  // ---------------------
  // Save RSVP to Google Sheet
  // ---------------------
  await addToSheet({
    firstName,
    lastName,
    email,
    phone,
    inviteCode,
    coming,
    plusOnes,
  });

  res.render("thankyou", { qr: qrImage });
});

// ---------------------
// Start the Server
// ---------------------
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
