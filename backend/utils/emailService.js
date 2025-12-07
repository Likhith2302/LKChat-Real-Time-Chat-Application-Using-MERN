import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  // For development/testing, use Gmail or another SMTP service
  // You can also use services like SendGrid, Mailgun, etc.
  
  // Option 1: Gmail (requires app-specific password)
  // Works for @gmail.com and Gmail-based institutional emails (like Gitam)
  if (process.env.EMAIL_SERVICE === 'gmail' || 
      (process.env.EMAIL_USER && !process.env.SMTP_HOST)) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // App-specific password for Gmail
      },
    });
  }

  // Option 2: Custom SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Option 3: Development - Use Ethereal Email (fake SMTP for testing)
  // This creates a test account and logs the email URL
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USER || 'test@ethereal.email',
      pass: process.env.ETHEREAL_PASS || 'test',
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"LKChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'LKChat - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                border-radius: 10px;
                color: white;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 10px;
                margin-top: 20px;
                color: #333;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                margin-top: 20px;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="margin: 0;">LKChat</h1>
              <p style="margin: 10px 0 0 0;">Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>You requested to reset your password for your LKChat account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} LKChat. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        LKChat - Password Reset Request
        
        Hello!
        
        You requested to reset your password for your LKChat account.
        
        Click this link to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you didn't request this password reset, please ignore this email.
        
        This is an automated message, please do not reply.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal Email (development), log the preview URL
    if (process.env.NODE_ENV === 'development' && info.messageId && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Email sent! Preview URL:', previewUrl);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email. Please try again later.');
  }
};

// Test email configuration
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server configuration error:', error.message);
    return false;
  }
};

