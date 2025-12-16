# web-search.js

**Path:** `plugins\research\web-search.js`

## Description
* Web Search Module

## Dependencies
- `../../src/logging/logger.js` → createLogger (L9)

## Exports
- **searchWeb** [function] (L37) - Search the web using DuckDuckGo Instant Answer API
- **formatSearchResults** [function] (L166) - Format search results for Discord display
- **isFactualQuestion** [function] (L200) - Check if a query looks like a factual question

## Functions
- ✓ `async searchWeb(query, maxResults = 5)` (L37) - Search the web using DuckDuckGo Instant Answer API
- ✓ `formatSearchResults(response)` (L166) - Format search results for Discord display
- ✓ `isFactualQuestion(query)` (L200) - Check if a query looks like a factual question

