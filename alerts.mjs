/*
  Alert manager
  Handles:
  - Sending email alerts
  - Sending webhook alerts
  - Rate limiting both alert types
 */
import nodemailer from 'nodemailer'

import config from "./config.mjs"
import {readFile} from "node:fs/promises";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const {smtp_host, smtp_username, smtp_password, recipients, from_address, emailCooldown} = config.config

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
const templatePromise = readFile(join(dirname(fileURLToPath(import.meta.url)), "alert-email.html"));

let lastEmailSentAt = 0

/**
 * Exported function. Verifies rate limits have not been violated, and sends the email via. enabled pathways.
 */

async function fillTemplate(values) {
  const template = await templatePromise

  const keys = Object.keys(values);
  let newString = `${template}`;
  for (const k of keys) {
    const exp = new RegExp(`{{${k}}}`, "g");
    newString = newString.replace(exp, values[k]);
  }
  return newString;
}


export async function reportIssue(fullReport, {orgName, reportId, contactInfo, domain}, {
  startTime,
  endTime
}, {successCount, failCount}, failures) {
  // Rate limit just to stop spam
  if (Date.now() - lastEmailSentAt < (emailCooldown * 1000)) return console.log("Not sending email: Ratelimit.")

  if (!mailEnabled) throw new Error("Can't send error - mail is not enabled.")

  const toEmails = recipients[domain] || recipients["otherwise"] || false
  if (!toEmails) return console.log(`No recipients for domain ${domain}`)

  let failureReports = []
  for (let counter = 0; counter < failures.length; counter++) {
    const fail = failures[counter]
    const extraInfo = fail["additional-info-uri"] ? `<a href="${fail["additional-info-uri"]}">${fail["additional-info-uri"]}</a>` : ""
    failureReports.push(`<table
                <tr>
                    <td><strong>Failure ${counter}</strong></td>
                </tr>
                <tr>
                    <td>Result type</td>
                    <td>${fail["result-type"]}</td>
                </tr>
                <tr>
                    <td>Sender server IP</td>
                    <td>${fail["sending-mta-ip"]}</td>
                </tr>
                <tr>
                    <td>Receiver</td>
                    <td>${fail["receiving-mx-hostname"]} (${fail["receiving-ip"]})</td>
                </tr>
                <tr>
                    <td>No. Failed sessions</td>
                    <td>${fail["failed-session-count"]}</td>
                </tr>
                <tr>
                    <td>Additional information</td>
                    <td>${extraInfo}</td>
                </tr>
                <tr>
                    <td>Failure reason</td>
                    <td>${fail["failure-reason-code"]}</td>
                </tr>
            </table>`)
  }
  const start = new Date(startTime)
  const end = new Date(endTime)


  const fullHtmlEmail = await fillTemplate({
    orgName,
    contactInfo,
    reportId,
    domain,
    failureDetails: failureReports.join("\r\n"),
    date: `${start.getUTCDate()}/${start.getUTCMonth() + 1}/${start.getUTCFullYear()}`,
    start: `${start.getUTCHours()}:${start.getUTCMinutes()}`,
    end: `${end.getUTCHours()}:${end.getUTCMinutes()}`,
    subject: `TLS report from ${orgName} has error for ${domain}`,
    successCount,
    failureCount: failCount
  })


  const info = await transport.sendMail({
    from: from_address,
    to: Array.isArray(toEmails) ? toEmails.join(",").slice(0, -1) : toEmails,
    subject: `TLS report from ${orgName} has failure for ${domain}`,
    text: fullHtmlEmail.replace(/<head>[\s\S]*<\/head>/, "").replace(/<[^>]*>/g, ""),
    html: fullHtmlEmail, // html body
    attachments: [
      {
        filename: "report.json",
        content: JSON.stringify(fullReport)
      }
    ]
  });
  lastEmailSentAt = Date.now()

  console.log("Message sent: %s", info.messageId);
}
