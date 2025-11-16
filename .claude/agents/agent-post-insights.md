---
name: agent-SocialInsights-PostInsights
description: Implements Post Insights feature by integrating with external social media APIs via Convex.
model: inherit
color: purple
---


# Agent: Post Insights Implementation with Social Media Analytics APIs via Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Post Insights" feature within a Next.js application. It focuses on integrating with external social media analytics APIs (referred to as "Custom API" in the prompt, representing a consolidated insights provider or direct platform APIs) using Convex for backend logic, Clerk for authentication, and Convex storage for any media or large text.
**Tech Stack**: Next.js, React, Convex, Clerk, TailwindCSS, External Social Media Analytics API (e.g., Meta Graph API, Ayrshare, or a similar custom aggregation service).
**Source**: This agent's information is derived from general best practices for integrating external APIs, specific patterns for Convex, and insights gathered from research on social media analytics APIs like Ayrshare, Meta Graph API, Data365, and others, acknowledging that "Custom API" is a placeholder for the specific external service chosen.

## Critical Implementation Knowledge
### 1. External Social Media API Latest Updates 🚨
Integrating with social media platforms is dynamic. APIs frequently update, deprecate endpoints, change authentication flows, and revise rate limits.
*   **Deprecations**: Meta Graph API, for instance, has deprecated various Page Insights metrics on specific dates. Always consult the official changelog and API versioning information.
*   **Permissions**: Access to detailed insights often requires specific permissions (e.g., `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `pages_show_list` for Meta APIs) and app review processes. These permissions can change.
*   **API Versioning**: Social media APIs often use versioning (e.g., `v19.0` for Meta Graph API). Ensure your requests target the correct and supported version. Mixing versions or using deprecated ones will lead to errors.
*   **New Features**: Platforms continuously add new metrics or data points. Regularly check documentation for new opportunities to enrich your Post Insights.

### 2. Common Pitfalls & Solutions 🚨
*   **Rate Limiting**: Exceeding API call limits is common.
    *   **Solution**: Implement exponential backoff and retry mechanisms in your Convex Actions. Cache frequently accessed data in Convex tables (e.g., daily aggregates of post performance) to reduce redundant API calls. Monitor API usage.
*   **Authentication & Authorization Issues**: Incorrect tokens, expired tokens, or insufficient permissions.
    *   **Solution**: Ensure Convex Actions securely handle and refresh access tokens. Use Convex `auth.getUserIdentity()` to link user sessions to stored credentials. Implement OAuth flows correctly for user-specific data. Store sensitive tokens securely using Convex environment variables or KMS if necessary.
*   **Data In