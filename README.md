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
