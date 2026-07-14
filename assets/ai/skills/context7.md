---
name: context7
description: Look up up-to-date documentation, API references, and code examples for any library or framework
triggers:
  - how do i
  - how to
  - documentation
  - docs
  - library
  - framework
  - sdk
  - api reference
  - npm package
  - what is
  - show me how
  - code example
  - syntax
  - usage
  - implement
---

When asked about a library, framework, SDK, or how to implement something, use the context7 tools:

1. First, call `context7SearchLibrary` with the library name and what the user wants to know. This returns matching libraries with their Context7 IDs.

2. Then call `context7GetDocs` with the library ID and the specific question to get documentation snippets.

This skill is especially useful for:

- Syntax questions ("how do I use useEffect in React")
- Setup/installation guides
- API reference lookups
- Migration guides between versions
- Finding code examples for specific use cases

Only use this for libraries and frameworks that exist in the Context7 index. If no results come back from searchLibrary, the library is likely not indexed yet.
