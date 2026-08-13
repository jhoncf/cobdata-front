---
inclusion: fileMatch
fileMatchPattern: "**/*.tsx,**/*.jsx"
---

# Web Interface Guidelines

Review UI code for Web Interface Guidelines compliance. Use when reviewing UI, checking accessibility, auditing design, or checking against best practices.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files
3. Check against all rules in the fetched guidelines
4. Output findings in terse file:line format

## Guidelines Source

When doing a UI review, fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When reviewing UI code:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines
