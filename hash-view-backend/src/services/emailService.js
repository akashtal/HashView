const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Fallback to SMTP or other providers
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const templates = {
  emailVerification: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - Hash View</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Hash View!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>Thank you for signing up for Hash View. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${data.verificationLink}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${data.verificationLink}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account with Hash View, please ignore this email.</p>
            <p>&copy; 2024 Hash View. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Hash View!
      
      Hi ${data.name},
      
      Thank you for signing up for Hash View. To complete your registration, please verify your email address by visiting this link:
      
      ${data.verificationLink}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with Hash View, please ignore this email.
      
      Best regards,
      The Hash View Team
    `
  }),

  passwordReset: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - Hash View</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>You requested to reset your password for your Hash View account. Click the button below to reset your password:</p>
            <a href="${data.resetLink}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${data.resetLink}</p>
            <p>This link will expire in 10 minutes for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Hash View. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${data.name},
      
      You requested to reset your password for your Hash View account. Visit this link to reset your password:
      
      ${data.resetLink}
      
      This link will expire in 10 minutes for security reasons.
      
      If you didn't request a password reset, please ignore this email.
      
      Best regards,
      The Hash View Team
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    const templateData = templates[template];
    if (!templateData) {
      throw new Error(`Email template '${template}' not found`);
    }

    const emailContent = templateData(data);

    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'Hash View',
        address: process.env.FROM_EMAIL || 'noreply@hashview.com'
      },
      to,
      subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;

  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

module.exports = { sendEmail };
