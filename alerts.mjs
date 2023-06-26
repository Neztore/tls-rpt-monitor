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
const {smtp_host, smtp_port, smtp_username, smtp_password, recipents} = config.config

const mailEnabled = smtp_host && smtp_username

let transport;
if (mailEnabled) {
  transport = nodemailer.createTransport({
    host: "smtp.example.com",
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
      user: "username",
      pass: "password",
    },
  });

}

let lastEmailSentAt = 0
/**
 * Exported function. Verifies rate limits have not been violated, and sends the email via. enabled pathways.
 */
export function reportIssue ({orgName, reportId, contactInfo}, {startTime, endTime}, {successCount, failCount}, failures) {
  console.log(`Report issue`)
}

async function sendEmailAlert (alert) {

}
