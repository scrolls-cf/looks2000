# Fleet themes

Each file is one **`@plugin "daisyui/theme"`** block. Imported from **`src/styles/app.css`**.

| Theme | Use when |
|-------|----------|
| **`devscrolls`** | Default fleet apps (dark). Set `data-theme="devscrolls"` on `<html>`. |
| **`devscrolls-light`** | Marketing, docs, or explicit light shells. |
| **`devscrolls-studio`** | Creative / design surfaces; slightly rounder, accent-forward. |
| **`devscrolls-ink`** | Dense dashboards and internal tools. |

Runtime source of truth for OKLCH values is these files. **`DESIGN.md`** holds rules and hex reference swatches.

Pick **one** theme per app shell unless the product spec requires switching.
