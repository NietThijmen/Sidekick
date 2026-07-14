---
name: firecrawl
description: Scrape and search the web using Firecrawl — extract full page content, crawl websites, and search with content-aware results
triggers:
  - scrape
  - crawl
  - web scrape
  - website content
  - extract content
  - firecrawl
  - web search
  - search the web
  - search web
  - fetch url
---

When the user needs to scrape a URL, crawl a website, or search the web with full page content, use the firecrawl tools:

1. `firecrawlScrapeUrl` — Scrape a single URL and return its content as markdown. Use this when the user provides a specific URL to extract content from.

2. `firecrawlSearch` — Search the web using Firecrawl and return results with scraped page content. Use this when the user wants to search for information online.

Firecrawl is better than basic HTTP fetch for:

- JavaScript-rendered websites that require a browser
- Extracting clean markdown from cluttered pages
- Getting full page content beyond just snippets
- Websites with anti-bot protections

## Important

Always give your sources as references underneath your response with links to the pages you read information from.
This helps users use this platform for academic research
