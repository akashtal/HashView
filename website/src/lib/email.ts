import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
// Remove all spaces from password (Gmail App Passwords should be 16 chars with no spaces)
const SMTP_PASS = (process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

// Log configuration on module load (for debugging)
if (typeof window === "undefined") {
  console.log("📧 [EMAIL INIT] SMTP Configuration loaded:", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER || "❌ NOT SET",
    passConfigured: SMTP_PASS ? `✅ ${SMTP_PASS.length} chars` : "❌ NOT SET",
    from: FROM_EMAIL || "❌ NOT SET",
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
  console.log("📧 [EMAIL] Attempting to send email...");
  console.log("📧 [EMAIL] SMTP Config Check:", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER || "❌ NOT SET",
    passLength: SMTP_PASS?.length || 0,
    passSet: SMTP_PASS ? "✅ SET" : "❌ NOT SET",
    from: FROM_EMAIL || "❌ NOT SET",
  });

  try {
    // Skip email if credentials are not configured
    if (!SMTP_USER || !SMTP_PASS || SMTP_USER === "" || SMTP_PASS === "") {
      console.log("❌ [EMAIL] SMTP credentials not configured - skipping email");
      return { success: false, error: "SMTP not configured", skipped: true };
    }

    console.log("✅ [EMAIL] SMTP credentials found, proceeding with email send...");

    const mailOptions = {
      from: `"HashView" <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
      html: options.html,
    };

    console.log("📧 [EMAIL] Sending email to:", mailOptions.to);
    console.log("📧 [EMAIL] Subject:", mailOptions.subject);

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ [EMAIL] Email sent successfully!");
    console.log("✅ [EMAIL] Message ID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ [EMAIL] Error sending email:");
    console.error("❌ [EMAIL] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("❌ [EMAIL] Error message:", error instanceof Error ? error.message : String(error));

    // Check for Gmail-specific errors
    if (error instanceof Error && error.message.includes("BadCredentials")) {
      console.error("❌ [EMAIL] GMAIL AUTHENTICATION ERROR!");
      console.error("❌ [EMAIL] The password is incorrect or you need to use a Gmail App Password.");
      console.error("❌ [EMAIL] See SETUP_EMAIL.md for instructions on how to get a Gmail App Password.");
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
  console.log("📧 [CONTACT EMAIL] Preparing contact form email notification...");
  console.log("📧 [CONTACT EMAIL] Contact data:", {
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
            <h1>📧 New Contact Form Submission</h1>
            <p>You have received a new message from your website</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">👤 Name</div>
              <div class="value">${contactData.name}</div>
            </div>
            <div class="field">
              <div class="label">📮 Email Address</div>
              <div class="value email">${contactData.email}</div>
            </div>
            <div class="field">
              <div class="label">📌 Subject</div>
              <div class="value">${contactData.subject}</div>
            </div>
            <div class="field">
              <div class="label">💬 Message</div>
              <div class="message-box">${contactData.message.replace(/\n/g, "\n")}</div>
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

  // Send to admin (optional - silent if fails)
  console.log("📧 [CONTACT EMAIL] Sending admin notification email...");
  const adminResult = await sendEmail({
    to: FROM_EMAIL,
    subject: `🔔 New Contact: ${contactData.subject}`,
    html: adminHtml,
  });

  if (adminResult.success) {
    console.log("✅ [CONTACT EMAIL] Admin notification sent successfully");
  } else if (adminResult.skipped) {
    console.log("⏭️ [CONTACT EMAIL] Admin notification skipped (SMTP not configured)");
  } else {
    console.log("❌ [CONTACT EMAIL] Admin notification failed:", adminResult.error);
  }

  // Send confirmation to user
  const confirmationHtml = `
    <!DOCTYPE html>
    <html>
      <head>
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

  // Send confirmation to user (optional - fails silently if email not configured)
  console.log("📧 [CONTACT EMAIL] Sending user confirmation email...");
  const userResult = await sendEmail({
    to: contactData.email,
    subject: "We've Received Your Message - HashView",
    html: confirmationHtml,
  });

  if (userResult.success) {
    console.log("✅ [CONTACT EMAIL] User confirmation sent successfully");
  } else if (userResult.skipped) {
    console.log("⏭️ [CONTACT EMAIL] User confirmation skipped (SMTP not configured)");
  } else {
    console.log("❌ [CONTACT EMAIL] User confirmation failed:", userResult.error);
  }
}

export async function sendSurveyNotification(surveyData: {
  type: "customer" | "partner";
  answers: Record<string, string>;
  contactDetails: {
    name: string;
    email: string;
    phone: string;
  };
}) {
  console.log("📧 [SURVEY EMAIL] Preparing survey email notification...");
  console.log("📧 [SURVEY EMAIL] Survey data:", {
    type: surveyData.type,
    answerCount: Object.keys(surveyData.answers).length,
    contactName: surveyData.contactDetails.name,
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
            <h1>📊 New ${surveyType} Survey Submission</h1>
            <p>You have received a new ${surveyType.toLowerCase()} survey response from <strong>${surveyData.contactDetails.name}</strong></p>
          </div>
          <div class="content">
            <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
               <div class="field">
                <div class="label">👤 Name</div>
                <div class="value">${surveyData.contactDetails.name}</div>
              </div>
              <div class="field">
                <div class="label">📮 Email</div>
                <div class="value email">${surveyData.contactDetails.email}</div>
              </div>
              <div class="field">
                <div class="label">📞 Phone</div>
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

  console.log("📧 [SURVEY EMAIL] Sending survey notification email...");
  const surveyResult = await sendEmail({
    to: FROM_EMAIL,
    subject: `New ${surveyType} Survey Submission - HashView`,
    html,
  });

  if (surveyResult.success) {
    console.log("✅ [SURVEY EMAIL] Survey notification sent successfully");
  } else if (surveyResult.skipped) {
    console.log("⏭️ [SURVEY EMAIL] Survey notification skipped (SMTP not configured)");
  } else {
    console.log("❌ [SURVEY EMAIL] Survey notification failed:", surveyResult.error);
  }
}

