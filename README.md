# tls-rpt-monitor

> Simple. Stupid. TLS Report monitoring.


Find out when something goes wrong. Don't find out when it doesn't.
Simple.

This tool listens for TLS RPT reports over HTTPS POST, and if it receives one indicating an error, sends an email to the configured email address.

I created it because who has time to waste reading reports every day?

[RFC8460](https://datatracker.ietf.org/doc/html/rfc8460).

## Installation
1. Clone or download this repository
2. Navigate into the folder and `npm install`
3. Configure environment variables as below
4. `npm start` (using your preferred process manager...)

## Environment Variables (& Configuration)
### Env variables (All required)
| Variable      | Type   | Notes                                                                                                                                |
|---------------|--------|--------------------------------------------------------------------------------------------------------------------------------------|
| from_address  | String | From address to use when sending alerts. May be ignored by your provider. Can be specified as `"Sender name" <name@domain.com>` too. |
| smtp_host     | String | SMTP server hostname to use to send emails. Will connect on 587.                                                                     |
| smtp_password | String | SMTP Password to use for auth                                                                                                        |
| smtp_username | String | SMTP username to use for auth                                                                                                        |

### Confg.json
Most of these values have defaults that can be left. Recipients must be populated, or alerts won't be sent.
| Variable      | Type   | Notes                                                                                                                    |
|---------------|--------|--------------------------------------------------------------------------------------------------------------------------|
| emailCooldown | Number | Basic cooldown to prevent spam. Will not send an alert if it has been less than emailCooldown seconds since the last one. |
| ignoredSenders         | Array<String> | Senders to ignore. Matched against report organisation name                                                         |
| recipients | Object | Recipient mappings. More information below.                                                                                           | |

#### Setting up recipients
The recipients object must be key-value pairs of domain: receivers.
Receivers can be either a single string (email address), an array of email addresses, or a comma seperated list of email addresses which will get alerts for that domain.
A catch-all can also be specified, using `otherwise` as the key. All alerts without a domain entry will be sent to those receivers.

To have all emails sent to a given email address, use the below:
```json
{
  "recipients": {
    "otherwise": "name@example.com"
  }
}

```
