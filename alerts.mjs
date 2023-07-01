/*
  Alert manager
  Handles:
  - Sending email alerts
  - Sending webhook alerts
  - Rate limiting both alert types
 */
import nodemailer from 'nodemailer'
import fetch from 'node-fetch'

import config from "./config.mjs"
const {smtp_host, smtp_username, smtp_password, recipents, from_address} = config.config

const mailEnabled = smtp_host && smtp_username

let transport;
if (mailEnabled) {
  transport = nodemailer.createTransport({
    host: smtp_host,
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: smtp_username,
      pass: smtp_password,
    },
  });

}

let lastEmailSentAt = 0
/**
 * Exported function. Verifies rate limits have not been violated, and sends the email via. enabled pathways.
 */
export async function reportIssue ({orgName, reportId, contactInfo}, {startTime, endTime}, {successCount, failCount}, failures) {
  console.log(`Report issue`)
  // todo: check rate limits

  if (!mailEnabled) throw new Error("Can't send error - mail is not enabled.")

  // todo: work out to where to send it

  const info = await transport.sendMail({
    from: from_address,
    to: "postmaster@muir.xyz",
    subject: `TLS report from ${orgName} has error`,
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
}
