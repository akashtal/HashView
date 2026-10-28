import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
// Remove all spaces from password (Gmail App Passwords should be 16 chars with no spaces)
const SMTP_PASS = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

// Log configuration on module load (for debugging)
if (typeof window === "undefined") {
  console.log("[EMAIL INIT] SMTP Configuration loaded:", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER || "NOT SET",
    passConfigured: SMTP_PASS ? `SET (${SMTP_PASS.length} chars)` : "NOT SET",
    from: FROM_EMAIL || "NOT SET",
  });
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // For Gmail
  },
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  console.log("[EMAIL] Attempting to send email...");
  console.log("[EMAIL] SMTP Config Check:", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER || "NOT SET",
    passLength: SMTP_PASS?.length || 0,
    passSet: SMTP_PASS ? "SET" : "NOT SET",
    from: FROM_EMAIL || "NOT SET",
  });

  try {
    // Skip email if credentials are not configured
    if (!SMTP_USER || !SMTP_PASS || SMTP_USER === "" || SMTP_PASS === "") {
      console.log("[EMAIL] SMTP credentials not configured - skipping email");
      return { success: false, error: "SMTP not configured", skipped: true };
    }

    console.log("[EMAIL] SMTP credentials found, proceeding with email send...");

    const mailOptions = {
      from: `"HashView" <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
      html: options.html,
    };

    console.log("[EMAIL] Sending email to:", mailOptions.to);
    console.log("[EMAIL] Subject:", mailOptions.subject);

    const info = await transporter.sendMail(mailOptions);
    console.log("[EMAIL] Email sent successfully!");
    console.log("[EMAIL] Message ID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL] Error sending email:");
    console.error("[EMAIL] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[EMAIL] Error message:", error instanceof Error ? error.message : String(error));

    // Check for Gmail-specific errors
    if (error instanceof Error && error.message.includes("BadCredentials")) {
      console.error("[EMAIL] GMAIL AUTHENTICATION ERROR!");
      console.error("[EMAIL] The password is incorrect or you need to use a Gmail App Password.");
      console.error("[EMAIL] See SETUP_EMAIL.md for instructions on how to get a Gmail App Password.");
    }

    return { success: false, error: error instanceof Error ? error.message : "Unknown error", skipped: false };
  }
}

export async function sendContactNotification(contactData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  console.log("[CONTACT EMAIL] Preparing contact form email notification...");
  console.log("[CONTACT EMAIL] Contact data:", {
    name: contactData.name,
    email: contactData.email,
    subject: contactData.subject,
    messageLength: contactData.message.length,
  });

  const adminHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
          .email-container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #7C3AED 0%, #F97316 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
          .header p { font-size: 14px; opacity: 0.9; }
          .content { padding: 30px 20px; }
          .field { margin-bottom: 25px; }
          .label { font-weight: 600; color: #7C3AED; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .value { padding: 12px 15px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #7C3AED; font-size: 15px; color: #333; word-wrap: break-word; }
          .value.email { color: #7C3AED; font-weight: 500; }
          .message-box { padding: 15px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #F97316; font-size: 15px; line-height: 1.8; white-space: pre-wrap; word-wrap: break-word; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer p { font-size: 12px; color: #666; }
          .badge { display: inline-block; padding: 5px 12px; background: #7C3AED; color: white; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 10px; }
          @media only screen and (max-width: 600px) {
            .email-container { margin: 10px; }
            .header { padding: 20px 15px; }
            .content { padding: 20px 15px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>&#128231; New Contact Form Submission</h1>
            <p>You have received a new message from your website</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">&#128100; Name</div>
              <div class="value">${contactData.name}</div>
            </div>
            <div class="field">
              <div class="label">&#128231; Email Address</div>
              <div class="value email">${contactData.email}</div>
            </div>
            <div class="field">
              <div class="label">&#128204; Subject</div>
              <div class="value">${contactData.subject}</div>
            </div>
            <div class="field">
              <div class="label">&#128172; Message</div>
              <div class="message-box">${contactData.message}</div>
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from your HashView website contact form</p>
            <p style="margin-top: 5px;">Reply directly to: <a href="mailto:${contactData.email}" style="color: #7C3AED; text-decoration: none;">${contactData.email}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const adminText = `New Contact Form Submission
You have received a new message from your website

Name: ${contactData.name}
Email: ${contactData.email}
Subject: ${contactData.subject}

Message:
${contactData.message}

---
This email was sent from your HashView website contact form
Reply directly to: ${contactData.email}
`;

  // Send to admin
  console.log("[CONTACT EMAIL] Sending admin notification email...");
  const adminResult = await sendEmail({
    to: FROM_EMAIL,
    subject: `New Contact: ${contactData.subject}`,
    html: adminHtml,
    text: adminText,
  });

  if (adminResult.success) {
    console.log("[CONTACT EMAIL] Admin notification sent successfully");
  } else if (adminResult.skipped) {
    console.log("[CONTACT EMAIL] Admin notification skipped (SMTP not configured)");
  } else {
    console.log("[CONTACT EMAIL] Admin notification failed:", adminResult.error);
  }

  // Send confirmation to user
  const confirmationHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #7C3AED 0%, #F97316 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Thank You for Contacting HashView!</h2>
          </div>
          <div class="content">
            <p>Hi ${contactData.name},</p>
            <p>We've received your message and will get back to you as soon as possible.</p>
            <p><strong>Your message:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #7C3AED;">
              ${contactData.message.replace(/\n/g, "<br>")}
            </p>
            <p>Best regards,<br>The HashView Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const confirmationText = `Hi ${contactData.name},

Thank you for contacting HashView! We've received your message and will get back to you as soon as possible.

Your message:
${contactData.message}

Best regards,
The HashView Team
`;

  // Send confirmation to user (optional - fails silently if email not configured)
  console.log("[CONTACT EMAIL] Sending user confirmation email...");
  const userResult = await sendEmail({
    to: contactData.email,
    subject: "We've Received Your Message - HashView",
    html: confirmationHtml,
    text: confirmationText,
  });

  if (userResult.success) {
    console.log("[CONTACT EMAIL] User confirmation sent successfully");
  } else if (userResult.skipped) {
    console.log("[CONTACT EMAIL] User confirmation skipped (SMTP not configured)");
  } else {
    console.log("[CONTACT EMAIL] User confirmation failed:", userResult.error);
  }
}

export async function sendSurveyNotification(surveyData: {
  type: "customer" | "partner";
  answers: Record<string, string>;
  contactDetails: {
    name: string;
    email: string;
    phone: string;
    businessName?: string;
    businessAddress?: string;
  };
}) {
  console.log("[SURVEY EMAIL] Preparing survey email notification...");
  console.log("[SURVEY EMAIL] Survey data:", {
    type: surveyData.type,
    answerCount: Object.keys(surveyData.answers).length,
    contactName: surveyData.contactDetails.name,
    businessName: surveyData.contactDetails.businessName,
  });

  const surveyType = surveyData.type === "customer" ? "Customer" : "Partner";

  const questions = surveyData.type === "customer"
    ? [
      "Do you usually check Google or TripAdvisor before visiting a place?",
      "Do you often leave reviews after your visit?",
      "Would you like to get instant rewards (scratch cards, cashback) for your reviews?",
      "Would you like to be notified when HASHVIEW launches in your city?",
    ]
    : [
      "Do you currently use Google Reviews or TripAdvisor to manage feedback?",
      "Are you happy with the reviews your business gets online?",
      "Would you like to get verified local reviews only from customers on venue?",
      "Would it help if customers were rewarded instantly for reviewing your business?",
      "How soon would you like to start getting genuine reviews?",
    ];

  const answersHtml = Object.entries(surveyData.answers)
    .map(([questionId, answer], index) => {
      const question = questions[parseInt(questionId) - 1] || `Question ${questionId}`;
      return `
        <div class="field">
          <div class="label">${index + 1}. ${question}</div>
          <div class="value">${answer}</div>
        </div>
      `;
    })
    .join("");

  const answersText = Object.entries(surveyData.answers)
    .map(([questionId, answer], index) => {
      const question = questions[parseInt(questionId) - 1] || `Question ${questionId}`;
      return `${index + 1}. ${question}\n${answer}\n`;
    })
    .join("\n");

  // NOTE: All emojis inside HTML use decimal HTML entities (e.g. &#128203;)
  // to avoid UTF-8 / Windows-1252 encoding corruption across different email clients.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
          .email-container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #7C3AED 0%, #F97316 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
          .header p { font-size: 14px; opacity: 0.9; }
          .content { padding: 30px 20px; }
          .field { margin-bottom: 25px; }
          .label { font-weight: 600; color: #7C3AED; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .value { padding: 12px 15px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #7C3AED; font-size: 15px; color: #333; word-wrap: break-word; }
          .value.email { color: #7C3AED; font-weight: 500; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; }
          .footer p { font-size: 12px; color: #666; }
          @media only screen and (max-width: 600px) {
            .email-container { margin: 10px; }
            .header { padding: 20px 15px; }
            .content { padding: 20px 15px; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>&#128203; New ${surveyType} Survey Submission</h1>
            <p>You have received a new ${surveyType.toLowerCase()} survey response from <strong>${surveyData.contactDetails.name}</strong></p>
          </div>
          <div class="content">
            <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
              ${surveyData.contactDetails.businessName ? `
              <div class="field">
                <div class="label">&#127970; Business Name</div>
                <div class="value" style="font-weight: 700; color: #7C3AED;">${surveyData.contactDetails.businessName}</div>
              </div>` : ""}
              ${surveyData.contactDetails.businessAddress ? `
              <div class="field">
                <div class="label">&#128205; Business Address</div>
                <div class="value">${surveyData.contactDetails.businessAddress}</div>
              </div>` : ""}
              <div class="field">
                <div class="label">&#128100; Contact Person</div>
                <div class="value">${surveyData.contactDetails.name}</div>
              </div>
              <div class="field">
                <div class="label">&#128231; Email</div>
                <div class="value email">${surveyData.contactDetails.email}</div>
              </div>
              <div class="field">
                <div class="label">&#128222; Phone</div>
                <div class="value">${surveyData.contactDetails.phone}</div>
              </div>
            </div>
            ${answersHtml}
          </div>
          <div class="footer">
            <p>This email was sent from your HashView website survey form</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `New ${surveyType} Survey Submission
You have received a new ${surveyType.toLowerCase()} survey response from ${surveyData.contactDetails.name}

${surveyData.contactDetails.businessName ? `Business Name: ${surveyData.contactDetails.businessName}\n` : ""}${surveyData.contactDetails.businessAddress ? `Business Address: ${surveyData.contactDetails.businessAddress}\n` : ""}Contact Person: ${surveyData.contactDetails.name}
Email: ${surveyData.contactDetails.email}
Phone: ${surveyData.contactDetails.phone}

Survey Responses:
${answersText}
---
This email was sent from your HashView website survey form
`;

  const subject = surveyData.contactDetails.businessName
    ? `New ${surveyType} Survey: ${surveyData.contactDetails.businessName} (${surveyData.contactDetails.name}) - HashView`
    : `New ${surveyType} Survey Submission - HashView`;

  console.log("[SURVEY EMAIL] Sending survey notification email...");
  const surveyResult = await sendEmail({
    to: FROM_EMAIL,
    subject,
    html,
    text,
  });

  if (surveyResult.success) {
    console.log("[SURVEY EMAIL] Survey notification sent successfully");
  } else if (surveyResult.skipped) {
    console.log("[SURVEY EMAIL] Survey notification skipped (SMTP not configured)");
  } else {
    console.log("[SURVEY EMAIL] Survey notification failed:", surveyResult.error);
  }
}


// -- QR Inquiry Email ----------------------------------------------------------

export async function sendQrInquiryNotification(data: {
  businessName?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  referralSource?: string;
}) {
  console.log("[QR INQUIRY EMAIL] Preparing QR inquiry email notification...");

  const referralMap: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    google: "Google",
    linkedin: "LinkedIn",
    twitter: "X / Twitter",
    tiktok: "TikTok",
    friend: "Friend / Word of Mouth",
    other: "Other",
  };
  const referralLabel = data.referralSource
    ? (referralMap[data.referralSource] || data.referralSource)
    : "Not specified";

  const now = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const initials = (data.businessName || data.name)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // NOTE: All emojis inside HTML use decimal HTML entities (e.g. &#127919;)
  // to avoid UTF-8 / Windows-1252 encoding corruption.
  const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New QR Code Inquiry</title>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- LOGO BAR -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="display:inline-block;background:#1a1a24;border-radius:12px;padding:12px 24px;border:1px solid #2a2a3a;">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <div style="width:32px;height:32px;background:linear-gradient(135deg,#7C3AED,#F97316);border-radius:8px;display:inline-block;text-align:center;line-height:32px;font-size:16px;color:#fff;">#</div>
              </td>
              <td style="vertical-align:middle;">
                <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Hash<span style="color:#F97316;">View</span></span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- MAIN CARD -->
        <tr><td style="background:#1a1a24;border-radius:20px;overflow:hidden;border:1px solid #2a2a3a;">

          <!-- GRADIENT HEADER -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,#7C3AED 0%,#9333ea 40%,#F97316 100%);padding:36px 32px 32px;text-align:center;">
                <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:5px 16px;margin-bottom:20px;">
                  <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">&#9889; New Lead</span>
                </div>
                <div style="font-size:36px;margin-bottom:8px;">&#127919;</div>
                <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">New QR Code Inquiry</h1>
                <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">A business owner wants their free QR code &mdash; reply within 24h</p>
                <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:12px 0 0;">Received: ${now} IST</p>
              </td>
            </tr>
          </table>

          <!-- LEAD IDENTITY CARD -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:28px 32px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:14px;border:1px solid #32324a;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align:top;padding-right:16px;">
                            <div style="width:52px;height:52px;background:linear-gradient(135deg,#7C3AED,#F97316);border-radius:50%;text-align:center;line-height:52px;font-size:18px;font-weight:800;color:#fff;">${initials}</div>
                          </td>
                          <td style="vertical-align:top;">
                            <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:4px;">${data.businessName || data.name}</div>
                            ${data.businessName ? `<div style="color:#c4b5fd;font-size:14px;font-weight:600;margin-bottom:3px;">Contact: ${data.name}</div>` : ""}
                            <a href="mailto:${data.email}" style="color:#a78bfa;font-size:14px;text-decoration:none;">${data.email}</a>
                            <div style="color:#94a3b8;font-size:13px;margin-top:3px;">${data.phone}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- DETAILS -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <!-- Business Info Section -->
            <tr><td style="padding:20px 32px 0;">
              <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;">Business Details</p>
            </td></tr>

            ${data.businessName ? `
            <tr><td style="padding:0 32px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:12px;border:1px solid #32324a;">
                <tr><td style="padding:16px 18px;">
                  <div style="color:#7C3AED;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Business Name</div>
                  <div style="color:#e2e8f0;font-size:16px;font-weight:700;">${data.businessName}</div>
                </td></tr>
              </table>
            </td></tr>` : ""}

            ${data.address ? `
            <tr><td style="padding:0 32px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:12px;border:1px solid #32324a;">
                <tr><td style="padding:16px 18px;">
                  <div style="color:#7C3AED;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Business Address</div>
                  <div style="color:#e2e8f0;font-size:15px;">${data.address}</div>
                </td></tr>
              </table>
            </td></tr>` : ""}

            <!-- Contact Info Section -->
            <tr><td style="padding:12px 32px 0;">
              <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;">Contact Details</p>
            </td></tr>

            <!-- Name + Phone row -->
            <tr><td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="vertical-align:top;padding-right:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:12px;border:1px solid #32324a;">
                      <tr><td style="padding:16px 18px;">
                        <div style="color:#7C3AED;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Contact Person</div>
                        <div style="color:#e2e8f0;font-size:15px;font-weight:600;">${data.name}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;padding-left:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:12px;border:1px solid #32324a;">
                      <tr><td style="padding:16px 18px;">
                        <div style="color:#7C3AED;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Phone</div>
                        <div style="color:#e2e8f0;font-size:15px;font-weight:600;">${data.phone}</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>

            <!-- Email -->
            <tr><td style="padding:12px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:12px;border-left:4px solid #F97316;border:1px solid #32324a;border-left:4px solid #F97316;">
                <tr><td style="padding:16px 18px;">
                  <div style="color:#F97316;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">Email Address</div>
                  <a href="mailto:${data.email}" style="color:#fb923c;font-size:16px;font-weight:700;text-decoration:none;">${data.email}</a>
                </td></tr>
              </table>
            </td></tr>

            <!-- Referral Source -->
            <tr><td style="padding:12px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#252535;border-radius:12px;border:1px solid #32324a;">
                <tr><td style="padding:16px 18px;">
                  <div style="color:#7C3AED;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">How They Found Us</div>
                  <span style="display:inline-block;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.4);border-radius:100px;padding:5px 16px;color:#c4b5fd;font-size:13px;font-weight:600;">${referralLabel}</span>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 32px 32px;text-align:center;">
              <a href="mailto:${data.email}?subject=Your%20Free%20HashView%20QR%20Code&body=Hi%20${encodeURIComponent(data.name)},"
                 style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#F97316);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:100px;">
                &#128231; Reply to ${data.name}
              </a>
              <p style="color:#475569;font-size:12px;margin:14px 0 0;">Aim to respond within 24 hours for best conversion</p>
            </td></tr>
          </table>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">Submitted via <strong style="color:#7C3AED;">HashView</strong> &mdash; &ldquo;Get Your Free QR Code&rdquo; form</p>
          <p style="color:#334155;font-size:11px;margin:6px 0 0;">This is an automated notification. Do not reply to this email directly.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const confirmationHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We have received your request</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- LOGO -->
        <tr><td style="padding-bottom:20px;text-align:center;">
          <span style="font-size:20px;font-weight:800;color:#1e293b;">Hash<span style="color:#F97316;">View</span></span>
        </td></tr>

        <!-- CARD -->
        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);border:1px solid #e2e8f0;">

          <!-- HEADER -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#7C3AED 0%,#F97316 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">&#127881;</div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">We have Got Your Request!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your free QR code is on its way</p>
            </td></tr>
          </table>

          <!-- BODY -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px;">
              <p style="color:#1e293b;font-size:16px;margin:0 0 8px;">Hi <strong>${data.name}</strong>,</p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Thank you for your interest in <strong>HashView</strong>! We have received your request${data.businessName ? ` for <strong style="color:#7C3AED;">${data.businessName}</strong>` : ""} and our team will be in touch within <strong style="color:#7C3AED;">24 hours</strong>.
              </p>

              <!-- Steps timeline -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;margin-bottom:24px;">
                <tr><td style="padding:20px 20px 4px;">
                  <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 16px;">What happens next</p>
                </td></tr>
                <tr><td style="padding:0 20px 20px;">

                  <!-- Step 1 -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;width:100%;">
                    <tr>
                      <td style="vertical-align:top;padding-right:14px;width:36px;">
                        <div style="width:28px;height:28px;background:linear-gradient(135deg,#7C3AED,#9333ea);border-radius:50%;text-align:center;line-height:28px;color:#fff;font-size:12px;font-weight:700;">1</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <div style="color:#1e293b;font-size:14px;font-weight:600;">Our team reviews your details</div>
                        <div style="color:#94a3b8;font-size:13px;">We will verify your business information</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 2 -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;width:100%;">
                    <tr>
                      <td style="vertical-align:top;padding-right:14px;width:36px;">
                        <div style="width:28px;height:28px;background:linear-gradient(135deg,#9333ea,#c026d3);border-radius:50%;text-align:center;line-height:28px;color:#fff;font-size:12px;font-weight:700;">2</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <div style="color:#1e293b;font-size:14px;font-weight:600;">We will contact you on <strong>${data.phone}</strong></div>
                        <div style="color:#94a3b8;font-size:13px;">Or we will reply to ${data.email}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 3 -->
                  <table cellpadding="0" cellspacing="0" style="width:100%;">
                    <tr>
                      <td style="vertical-align:top;padding-right:14px;width:36px;">
                        <div style="width:28px;height:28px;background:linear-gradient(135deg,#F97316,#ea580c);border-radius:50%;text-align:center;line-height:28px;color:#fff;font-size:12px;font-weight:700;">3</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <div style="color:#1e293b;font-size:14px;font-weight:600;">Your QR code gets set up &mdash; completely free!</div>
                        <div style="color:#94a3b8;font-size:13px;">Start collecting verified reviews instantly</div>
                      </td>
                    </tr>
                  </table>

                </td></tr>
              </table>

              <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;">Any urgent questions? Just reply to this email.</p>
              <p style="color:#475569;font-size:15px;margin:20px 0 0;">Best regards,<br/><strong style="color:#1e293b;">The HashView Team</strong></p>
            </td></tr>
          </table>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">You received this because you submitted a QR code request at <strong>hashview.app</strong></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const adminText = `New QR Code Inquiry
${data.businessName ? `Business Name: ${data.businessName}\n` : ""}Business Address: ${data.address || "Not specified"}
Contact Name: ${data.name}
Phone: ${data.phone}
Email: ${data.email}
How They Found Us: ${referralLabel}
Received: ${now} IST
`;

  const confirmationText = `Hi ${data.name},

Thank you for your interest in HashView! We have received your request${data.businessName ? ` for ${data.businessName}` : ""} and our team will be in touch within 24 hours.

What happens next:
1. Our team reviews your business details
2. We will contact you on ${data.phone} or reply to ${data.email}
3. Your QR code gets set up - completely free!

Best regards,
The HashView Team
`;

  // Admin alert
  const adminSubject = data.businessName
    ? `[HashView] New QR Lead: ${data.businessName} (${data.name} - ${data.phone})`
    : `[HashView] New QR Lead: ${data.name} (${data.phone})`;

  const adminResult = await sendEmail({
    to: FROM_EMAIL,
    subject: adminSubject,
    html: adminHtml,
    text: adminText,
  });
  console.log(
    adminResult.success
      ? "[QR INQUIRY EMAIL] Admin alert sent successfully"
      : adminResult.skipped
      ? "[QR INQUIRY EMAIL] Admin alert skipped (SMTP not configured)"
      : `[QR INQUIRY EMAIL] Admin alert failed: ${adminResult.error}`
  );

  // User confirmation
  const userResult = await sendEmail({
    to: data.email,
    subject: `[HashView] We have received your QR Code request!`,
    html: confirmationHtml,
    text: confirmationText,
  });
  console.log(
    userResult.success
      ? "[QR INQUIRY EMAIL] User confirmation sent"
      : userResult.skipped
      ? "[QR INQUIRY EMAIL] User confirmation skipped (SMTP not configured)"
      : `[QR INQUIRY EMAIL] User confirmation failed: ${userResult.error}`
  );
}
