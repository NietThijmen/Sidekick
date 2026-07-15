---
name: nslookup
description: DNS lookups, SSL certificate checks, security scanning, DNS health audits, and domain intelligence via NSLookup.io
triggers:
  - dns
  - nslookup
  - domain
  - ssl
  - certificate
  - security scan
  - uptime
  - geo
  - dns health
  - dns propagation
  - dns lookup
  - dns record
  - dns records
  - mx record
  - txt record
  - spf
  - dmarc
  - dkim
  - caa
  - nameserver
  - a record
  - aaaa record
  - cname
  - soa record
  - ptr record
  - srv record
  - ip address
  - propagation
  - website is down
  - check website
  - is it up
  - geo score
  - ai readiness
  - dns audit
  - sshfp
  - dnskey
  - ds record
  - nsec
  - loc record
---

When activated, use these NSLookup.io DNS and security tools:

- `dnsLookup` to look up all common DNS records (A, AAAA, NS, MX, TXT, CNAME, SOA) for a domain at once.
- `dnsRecord` to look up a specific DNS record type (e.g., MX, TXT, CAA, SPF, SRV, PTR, HTTPS, TLSA, SSHFP, DNSKEY, DS, RRSIG, NSEC, LOC, HINFO, NAPTR).
- `ipAddresses` to get only the IPv4 (A) and IPv6 (AAAA) addresses for a domain.
- `dnsPropagation` to check DNS record propagation across 18+ global DNS servers.
- `dnsHealth` to run a comprehensive DNS health audit (39 checks across 7 categories, returns a 0-100 score).
- `sslCertificate` to check a domain's SSL/TLS certificate (issuer, expiry, SAN domains, cipher, chain validation).
- `securityScan` to run a security scan checking for DNS misconfigurations, SPF/DKIM/DMARC issues, cookie security, HTTP headers, and web vulnerabilities.
- `uptimeCheck` to check if a URL is responding and measure response time.
- `geoCheck` to check GEO (Generative Engine Optimization) score for AI search engine readiness.

## Workflow

1. Identify the user's intent (look up DNS, check SSL, scan security, check DNS health, etc.).
2. Choose the most specific tool for the job:
   - "What are the DNS records for..." → `dnsLookup`
   - "What is the MX record for..." → `dnsRecord` with type "MX"
   - "Has my DNS propagated?" → `dnsPropagation`
   - "Audit my DNS setup" → `dnsHealth`
   - "Is my SSL certificate valid?" → `sslCertificate`
   - "Scan my domain for security issues" → `securityScan`
   - "Is my website up?" → `uptimeCheck`
   - "How AI-ready is my site?" → `geoCheck`
   - "What IPs does my domain resolve to?" → `ipAddresses`
3. Present results in a clear, structured format.

## Common DNS Record Types

| Type   | Purpose                                           |
| ------ | ------------------------------------------------- |
| A      | IPv4 address                                      |
| AAAA   | IPv6 address                                      |
| CNAME  | Canonical name (alias)                            |
| MX     | Mail exchange server                              |
| TXT    | Text records (SPF, DKIM, DMARC, verification)     |
| NS     | Nameserver                                        |
| SOA    | Start of authority                                |
| CAA    | Certification authority authorization             |
| SPF    | Sender Policy Framework (returns parsed SPF data) |
| SRV    | Service locator                                   |
| PTR    | Reverse DNS lookup (pass an IP as domain)         |
| HTTPS  | HTTPS binding for HTTP/3 and ECH                  |
| TLSA   | DANE certificate association for TLS              |
| SSHFP  | SSH host key fingerprint                          |
| DNSKEY | DNSSEC cryptographic key                          |
| DS     | DNSSEC delegation signer                          |
| RRSIG  | DNSSEC resource record signature                  |

## DNS Servers

Valid values: `cloudflare` (default), `cloudflare2`, `google`, `quad9`, `opendns`, `authoritative`, `southafrica`, `australia`, `india`, `thenetherlands`, `canada`, `usa`, `brazil`, `ukraine`, `russia`.

Use `authoritative` to query the domain's own nameservers directly (bypassing public resolvers).

## Alert Levels (SSL Certificate)

| Level    | Meaning             |
| -------- | ------------------- |
| ok       | > 90 days valid     |
| info     | 60-90 days          |
| warning  | 30-60 days          |
| critical | 0-30 days           |
| expired  | Certificate expired |

## Security Scan Severity Levels

- `critical` — immediate attention required
- `high` — serious issue
- `medium` — moderate risk
- `low` — minor concern
- `info` — informational finding

## Rate Limits

- DNS Lookup, Propagation & Health: 30 requests/minute
- SSL Certificate, BIMI/VMC, Uptime, GEO: 100 requests/minute
- Security Scan: 5 requests/minute, 20 requests/hour
