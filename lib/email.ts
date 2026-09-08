import { Resend } from "resend"
import { brand } from "./brand-config"

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set")
  }
  return new Resend(apiKey)
}

export interface SendVerificationEmailProps {
  to: string
  code: string
  fullName?: string
}

export async function sendVerificationEmail({ to, code, fullName }: SendVerificationEmailProps) {
  const fromEmail = process.env.FROM_EMAIL || "noreply@example.com"

  try {
    console.log("[email] Sending verification email to:", to)

    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Verify Your ${brand.name} Account`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your ${brand.name} Account</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
              }
              .container {
                background: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 32px;
                font-weight: bold;
                color: #000;
                margin-bottom: 10px;
                font-style: italic;
              }
              .code-container {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
              }
              .verification-code {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #000;
                font-family: 'Courier New', monospace;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                font-size: 14px;
                color: #666;
                text-align: center;
              }
              .button {
                display: inline-block;
                background: #000;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">${brand.name}</div>
                <h1>Verify Your Account</h1>
                <p>Welcome${fullName ? ` ${fullName}` : ""}! Please verify your email address to complete your account setup.</p>
              </div>
              
              <div class="code-container">
                <p style="margin: 0 0 10px 0; font-size: 16px; color: #666;">Your verification code is:</p>
                <div class="verification-code">${code}</div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">This code will expire in 10 minutes</p>
              </div>
              
              <p>Enter this code on the verification page to activate your ${brand.name} account and start enjoying premium barbering services.</p>
              
              <p>If you didn't request this verification code, please ignore this email.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to ${brand.name}!

Your verification code is: ${code}

Enter this code on the verification page to activate your account.

This code will expire in 10 minutes.

If you didn't request this verification code, please ignore this email.

© ${new Date().getFullYear()} ${brand.name}. All rights reserved.
      `.trim(),
    })

    if (error) {
      console.error("[email] Resend error:", error)
      console.error("[email] Error details:", JSON.stringify(error, null, 2))
      
      if (error.message && error.message.includes("testing emails")) {
        throw new Error(
          "Testing limitation: You can only send emails to your own verified email address. To send to other recipients, verify a domain at resend.com/domains.",
        )
      }
      if (error.message && error.message.includes("API key")) {
        throw new Error("Invalid or missing RESEND_API_KEY. Please check your environment variables.")
      }
      if (error.message && error.message.includes("domain")) {
        throw new Error("Domain not verified. Please verify your domain at resend.com/domains.")
      }
      throw new Error(`Failed to send email: ${error.message || "Unknown error"} (Code: ${error.statusCode || 'N/A'})`)
    }

    console.log("[email] Email sent successfully:", data)
    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error("[email] Error sending verification email:", error)
    throw new Error(`Email sending failed: ${error.message || "Unknown error"}`)
  }
}

export interface SendReviewRequestEmailProps {
  to: string
  reviewUrl: string
  fullName?: string
}

// Fired once per completed booking (see app/api/admin/bookings/[id]/route.ts) —
// not a bulk send, so a single resend.emails.send() per call, matching the
// other single-recipient sends here rather than the batch API used for
// account-wide reminders.
export async function sendReviewRequestEmail({ to, reviewUrl, fullName }: SendReviewRequestEmailProps) {
  const fromEmail = process.env.FROM_EMAIL || "noreply@example.com"

  try {
    console.log("[email] Sending review request email to:", to)

    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: "How was your cut?",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>How was your cut?</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
              }
              .container {
                background: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 32px;
                font-weight: bold;
                color: #000;
                margin-bottom: 10px;
                font-style: italic;
              }
              .button {
                display: inline-block;
                background: #000;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                font-size: 14px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">${brand.name}</div>
                <h1>How was your cut?</h1>
                <p>Hi${fullName ? ` ${fullName}` : ""}, thanks for coming in! If you have a minute, a review helps the shop out a lot.</p>
              </div>

              <div style="text-align: center;">
                <a href="${reviewUrl}" class="button">Leave a Review</a>
              </div>

              <div class="footer">
                <p>© ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
How was your cut?

Hi${fullName ? ` ${fullName}` : ""}, thanks for coming in! If you have a minute, a review helps the shop out a lot.

Leave a review: ${reviewUrl}

© ${new Date().getFullYear()} ${brand.name}. All rights reserved.
      `.trim(),
    })

    if (error) {
      console.error("[email] Resend error:", error)
      throw new Error(`Failed to send email: ${error.message || "Unknown error"} (Code: ${error.statusCode || 'N/A'})`)
    }

    console.log("[email] Review request email sent successfully:", data)
    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error("[email] Error sending review request email:", error)
    throw new Error(`Email sending failed: ${error.message || "Unknown error"}`)
  }
}

export interface SendPasswordResetEmailProps {
  to: string
  resetUrl: string
  fullName?: string
}

export async function sendPasswordResetEmail({ to, resetUrl, fullName }: SendPasswordResetEmailProps) {
  const fromEmail = process.env.FROM_EMAIL || "noreply@example.com"

  try {
    console.log("[email] Sending password reset email to:", to)

    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Reset Your ${brand.name} Password`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your ${brand.name} Password</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
              }
              .container {
                background: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 32px;
                font-weight: bold;
                color: #000;
                margin-bottom: 10px;
                font-style: italic;
              }
              .button {
                display: inline-block;
                background: #000;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                font-size: 14px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">${brand.name}</div>
                <h1>Reset Your Password</h1>
                <p>Hi${fullName ? ` ${fullName}` : ""}, we received a request to reset your ${brand.name} password.</p>
              </div>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">This link will expire in 30 minutes.</p>
              </div>

              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 13px; color: #555;">${resetUrl}</p>

              <p>If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>

              <div class="footer">
                <p>© ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Reset Your ${brand.name} Password

We received a request to reset your password. Visit the link below to choose a new one:

${resetUrl}

This link will expire in 30 minutes.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} ${brand.name}. All rights reserved.
      `.trim(),
    })

    if (error) {
      console.error("[email] Resend error:", error)
      throw new Error(`Failed to send email: ${error.message || "Unknown error"} (Code: ${error.statusCode || 'N/A'})`)
    }

    console.log("[email] Password reset email sent successfully:", data)
    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error("[email] Error sending password reset email:", error)
    throw new Error(`Email sending failed: ${error.message || "Unknown error"}`)
  }
}

export interface NotificationReminderRecipient {
  email: string
  name?: string
}

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// RFC 2606 reserved domains — Resend's batch API rejects the *entire*
// batch call if any single recipient's address is on one of these
// (confirmed live: "Invalid `to` field ... domains like `example.com`"),
// so one leftover test/placeholder account in the customer collection
// silently blocked the reminder email for every real customer batched
// alongside it. Filtered out up front instead.
const RESERVED_TEST_DOMAIN_RE = /@(example\.(com|net|org|edu)|test|invalid|localhost)$/i

function isSendableEmail(email: string): boolean {
  return EMAIL_FORMAT_RE.test(email) && !RESERVED_TEST_DOMAIN_RE.test(email)
}

// Separate from the OneSignal-based push/email broadcast at
// /admin/broadcast — that tool's email channel goes through OneSignal,
// which is currently disabled for this account ("Email sending for this
// app has been disabled"). This goes through Resend directly, the same
// infra already confirmed working for verification/reset emails, so it
// isn't blocked by that. Purpose: push permission can only ever be
// granted by a visitor actively on the site (no way to flip it on
// remotely for someone who hasn't visited), so this reaches existing
// customers through a channel that doesn't have that limitation and
// points them back to the site to enable it themselves.
export async function sendNotificationReminderEmails(recipients: NotificationReminderRecipient[]) {
  const sendable = recipients.filter((r) => isSendableEmail(r.email))
  const skipped = recipients.length - sendable.length
  if (skipped > 0) {
    console.warn(
      "[email] Notification reminder: skipping unsendable address(es):",
      recipients.filter((r) => !isSendableEmail(r.email)).map((r) => r.email)
    )
  }
  if (sendable.length === 0) return { success: true, sent: 0, skipped }

  const fromEmail = process.env.FROM_EMAIL || "noreply@example.com"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
  const resend = getResendClient()

  let sent = 0
  let failed = 0

  // Sent one at a time rather than through resend.batch.send() — the
  // format pre-filter above still let through at least one address
  // Resend's validator rejects for a reason its own error doesn't name
  // (confirmed live: a second, differently-invalid address surfaced
  // this way after the first reserved-domain one was filtered out).
  // Since a batch call fails *atomically* with no indication of which
  // entry was the problem, individual sends are the only way to isolate
  // exactly one bad address instead of losing an entire chunk of good
  // ones to it. Sequential with a small delay to stay under Resend's
  // per-second rate limit.
  for (const r of sendable) {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [r.email],
      subject: "Turn on notifications for booking reminders",
      html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Turn on notifications</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f8f9fa;
                }
                .container {
                  background: white;
                  border-radius: 8px;
                  padding: 40px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .logo {
                  font-size: 32px;
                  font-weight: bold;
                  color: #000;
                  margin-bottom: 10px;
                  font-style: italic;
                }
                .button {
                  display: inline-block;
                  background: #000;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 500;
                  margin: 20px 0;
                }
                .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e9ecef;
                  font-size: 14px;
                  color: #666;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">${brand.name}</div>
                  <h1>Never miss a booking</h1>
                  <p>Hi${r.name ? ` ${r.name}` : ""}, turn on notifications to get reminders about your appointments and updates from the shop.</p>
                </div>

                <div style="text-align: center;">
                  <a href="${siteUrl}" class="button">Visit ${brand.name}</a>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Log in, then tap "Enable Notifications" when it appears.</p>
                </div>

                <div class="footer">
                  <p>© ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
                  <p>This is a one-time reminder — you won't get this again.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Never miss a booking

Hi${r.name ? ` ${r.name}` : ""}, turn on notifications to get reminders about your appointments and updates from the shop.

Visit ${siteUrl}, log in, then tap "Enable Notifications" when it appears.

© ${new Date().getFullYear()} ${brand.name}. All rights reserved.
This is a one-time reminder — you won't get this again.
        `.trim(),
    })

    if (error) {
      console.warn(`[email] Notification reminder skipped for ${r.email}:`, error)
      failed++
    } else {
      sent++
    }

    // Stay under Resend's per-second rate limit between sequential sends.
    await new Promise((resolve) => setTimeout(resolve, 550))
  }

  if (sent === 0 && failed > 0) {
    throw new Error("Failed to send reminder emails: every send failed")
  }

  return { success: true, sent, skipped: skipped + failed }
}

export async function testEmailConnection() {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev"

    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }

    return { success: true, fromEmail, apiKeyConfigured: !!apiKey }
  } catch (error: any) {
    console.error("[email] Email configuration test failed:", error)
    return { success: false, error: error.message }
  }
}
