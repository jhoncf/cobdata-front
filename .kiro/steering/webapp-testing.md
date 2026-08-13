---
inclusion: manual
---

# Web Application Testing

Toolkit for testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, and capturing screenshots.

## Decision Tree

1. Is it static HTML? -> Read HTML file directly to identify selectors, then write Playwright script
2. Is the server already running?
   - No -> Start it first, then write Playwright script
   - Yes -> Navigate and wait for networkidle, take screenshot or inspect DOM, identify selectors, execute actions

## Reconnaissance-Then-Action Pattern

1. **Inspect rendered DOM**:
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **Identify selectors** from inspection results

3. **Execute actions** using discovered selectors

## Common Pitfall

- Don't inspect the DOM before waiting for networkidle on dynamic apps
- Always wait for `page.wait_for_load_state('networkidle')` before inspection

## Best Practices

- Use sync_playwright() for synchronous scripts
- Always close the browser when done
- Use descriptive selectors: text=, role=, CSS selectors, or IDs
- Add appropriate waits: page.wait_for_selector() or page.wait_for_timeout()
- Always launch chromium in headless mode
