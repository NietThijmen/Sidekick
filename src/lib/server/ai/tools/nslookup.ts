import { tool } from 'ai';
import { z } from 'zod';

const NSLOOKUP_BASE = 'https://www.nslookup.io';

async function nslookupGet(path: string) {
	const response = await fetch(`${NSLOOKUP_BASE}${path}`, {
		headers: { Accept: 'application/json' }
	});
	if (!response.ok) {
		const text = await response.text();
		return { error: `NSLookup API error (${response.status}): ${text}` };
	}
	return response.json();
}

async function nslookupPost(path: string, body: unknown) {
	const response = await fetch(`${NSLOOKUP_BASE}${path}`, {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const text = await response.text();
		return { error: `NSLookup API error (${response.status}): ${text}` };
	}
	return response.json();
}

const DNS_SERVERS = [
	'cloudflare',
	'cloudflare2',
	'google',
	'quad9',
	'opendns',
	'authoritative',
	'southafrica',
	'australia',
	'india',
	'thenetherlands',
	'canada',
	'usa',
	'brazil',
	'ukraine',
	'russia'
] as const;

export const nslookupTools = {
	dnsLookup: tool({
		description:
			'Look up common DNS records (A, AAAA, NS, MX, TXT, CNAME, SOA) for a domain in a single request. Returns all records at once.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name to look up, e.g. "github.com"'),
			server: z
				.enum(DNS_SERVERS)
				.optional()
				.default('cloudflare')
				.describe('DNS server to query. Use "authoritative" for the domain\'s own nameservers')
		}),
		execute: async ({ domain, server }: { domain: string; server?: string }) => {
			const params = new URLSearchParams({ domain });
			if (server) params.set('server', server);
			return nslookupGet(`/api/v1/records?${params.toString()}`);
		}
	} as any),

	dnsRecord: tool({
		description:
			'Look up a specific DNS record type for a domain. Supports 53 record types including A, AAAA, MX, TXT, CNAME, NS, SOA, CAA, SPF, SRV, PTR, and more. Use for PTR lookups by passing an IP address as domain.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name or IP address (for PTR lookups)'),
			type: z
				.string()
				.describe(
					'DNS record type, e.g. "A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA", "CAA", "SPF", "SRV", "PTR", "HTTPS", "TLSA", "SSHFP", "DNSKEY", "DS", "RRSIG", "NSEC", "NSEC3", "LOC", "HINFO", "NAPTR", etc.'
				),
			server: z.enum(DNS_SERVERS).optional().default('cloudflare').describe('DNS server to query')
		}),
		execute: async ({
			domain,
			type,
			server
		}: {
			domain: string;
			type: string;
			server?: string;
		}) => {
			const params = new URLSearchParams({ domain, type });
			if (server) params.set('server', server);
			return nslookupGet(`/api/v1/records/other?${params.toString()}`);
		}
	} as any),

	ipAddresses: tool({
		description: 'Get IPv4 (A) and IPv6 (AAAA) addresses for a domain.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name, e.g. "github.com"')
		}),
		execute: async ({ domain }: { domain: string }) => {
			return nslookupPost('/api/v1/records/webservers', { domain });
		}
	} as any),

	dnsPropagation: tool({
		description:
			'Check DNS record propagation across 18+ global DNS servers including Cloudflare, Google, Quad9, OpenDNS, and regional servers. See which servers have the latest records.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name to check'),
			recordType: z
				.string()
				.describe('DNS record type to check propagation for, e.g. "A", "MX", "TXT", "CNAME"')
		}),
		execute: async ({ domain, recordType }: { domain: string; recordType: string }) => {
			return nslookupPost('/api/v1/propagation', { domain, recordType });
		}
	} as any),

	dnsHealth: tool({
		description:
			'Run a comprehensive DNS health audit for a domain. Checks 39 items across 7 categories: DNSSEC, MX & Email, DNS Hygiene, TTL & SOA, Nameservers, CAA, and Operations. Returns a severity-weighted score (0-100).',
		inputSchema: z.object({
			domain: z.string().describe('Domain name to audit, e.g. "github.com"')
		}),
		execute: async ({ domain }: { domain: string }) => {
			return nslookupGet(`/api/v1/dns-health/${encodeURIComponent(domain)}`);
		}
	} as any),

	sslCertificate: tool({
		description:
			'Check the SSL/TLS certificate for a domain. Returns certificate details including issuer, validity dates, days until expiry, chain validation, SAN domains, cipher info, and alert level.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name to check SSL for, e.g. "github.com"')
		}),
		execute: async ({ domain }: { domain: string }) => {
			return nslookupPost('/portal-api/v1/certificates/check', { domain });
		}
	} as any),

	securityScan: tool({
		description:
			'Run a comprehensive security scan on a domain. Detects DNS misconfigurations, missing/invalid SPF/DKIM/DMARC records, cookie security issues, HTTP security header gaps, and web vulnerabilities. Returns findings with severity levels.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name to scan, e.g. "example.com"')
		}),
		execute: async ({ domain }: { domain: string }) => {
			return nslookupPost('/scanner-api/v1/security-scan', { domain });
		}
	} as any),

	uptimeCheck: tool({
		description:
			'Check if a URL is up and responding. Measures response time and HTTP status code.',
		inputSchema: z.object({
			url: z.string().describe('Full URL to check, e.g. "https://github.com"'),
			timeout: z
				.number()
				.int()
				.min(1000)
				.max(30000)
				.optional()
				.default(10000)
				.describe('Timeout in milliseconds (default: 10000)')
		}),
		execute: async ({ url, timeout }: { url: string; timeout?: number }) => {
			return nslookupPost('/portal-api/v1/uptime/check', { url, timeout });
		}
	} as any),

	geoCheck: tool({
		description:
			'Check GEO (Generative Engine Optimization) score for a domain. Analyzes AI search engine readiness (ChatGPT, Gemini, Claude, Perplexity) with scores for Technical Readiness, Entity Readiness, and Answer Readiness. Includes AI crawler access status and recommendations.',
		inputSchema: z.object({
			domain: z.string().describe('Domain name to check, e.g. "github.com"')
		}),
		execute: async ({ domain }: { domain: string }) => {
			return nslookupPost('/portal-api/v1/geo/check', { domain });
		}
	} as any)
};
