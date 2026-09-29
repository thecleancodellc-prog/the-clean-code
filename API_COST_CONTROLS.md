# API Cost Controls

The Clean Code uses local generation where practical and records estimated OpenAI API spending in
`logs/openai-usage.json`. This local ledger contains no API key and begins tracking from the date this
feature was installed. The OpenAI Usage page remains the authoritative billing record.

## Defaults

- Text model: `gpt-4.1-mini`
- Factory cover provider: local ComfyUI with checkpoint allowlisting and person/NSFW screening
- Per-factory-run OpenAI cap: `$0.35`
- Local monthly OpenAI cap: `$10.00`
- Paid image generation is never used as an automatic fallback

## Environment overrides

Add only the settings you intentionally want to change to `.env.local`:

```text
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_WRITING_MODEL=gpt-4.1-mini
OPENAI_RUN_BUDGET_USD=0.35
OPENAI_MONTHLY_BUDGET_USD=10
FACTORY_IMAGE_PROVIDER=local
```

`FACTORY_IMAGE_PROVIDER` accepts `local`, `openai`, or `fallback`. Choosing `openai` explicitly enables
paid cover generation. `fallback` creates a zero-cost SVG title cover.

## Commands

```bash
npm run api:usage
npm run api:budget-test
```

The local monthly cap covers calls made through the factory's budgeted agents. It cannot see API usage
from other projects or tools, so confirm actual charges at https://platform.openai.com/usage and set an
account or project budget there as a second layer.
