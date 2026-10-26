# AI Core Curriculum Builder

A web app that helps Yale SOM faculty (smart, but not AI experts) design an AI core course for MBA students. It has three parts:

- **Module briefings** on (1) AI modalities and business use cases, (2) AI safety and governance, and (3) AI, the labor market and the US economy. Each briefing has key topics, discussion questions, class activities and hand-verified readings.
- **A live AI news feed** from 20 reputable outlets and newsletters, including The Economist, WSJ, The New York Times, BBC, FT, MIT Technology Review, Alex Imas, Ethan Mollick, Import AI, BlueDot Impact and Epoch AI. Each story is tagged by module.
- **A Curriculum Builder**, in which AI agents draft a session-by-session syllabus. Every citation is checked against the verified library or the live feed, so the AI cannot invent a source.

## Run it locally (about 3 minutes)

You need Python 3.9 or newer.

```bash
git clone https://github.com/aihw4/ai-core-curriculum-builder.git
cd ai-core-curriculum-builder
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then paste your PORTKEY_API_KEY into .env
python app.py
```

Open **http://localhost:5050**.

- The app looks for `.env` in this folder first, then in the folder one level above.
- **Without a key**, the briefings, library and news feed still work, but news stories are untagged. Only the Curriculum Builder needs the key.
- **With no internet**, the news tab falls back to a bundled sample in `data/sample_news.json`.
- A full syllabus run takes about 1 minute.

## Safety tests (no key needed)

```bash
python test_safety.py
```

These tests show three defenses working:
- The Citation Checker removes invented reading IDs and raw URLs.
- The Input Guard strips prompt-injection text from faculty notes.
- The feed sanitizer flags injected text in news items.

## How it works

| Step | Type | What it does |
|---|---|---|
| News Curator | LLM agent + RSS tool | Fetches live feeds, sanitizes them, and tags each story to Module 1/2/3 with a teaching hook. Cached for 6 hours and shared by all users. |
| Curriculum Designer | LLM agent | Drafts the syllabus from faculty inputs. It may cite only library IDs (`L01`–`L46`) and news IDs (`N01`…). |
| Citation Checker | Code (no LLM) | Replaces each ID with its verified title and URL, and removes any ID or URL that doesn't exist. |
| Balance Reviewer | LLM agent | Flags one-sided framing, unsupported numbers, missing stakeholders and weighting problems. |

All agents use `gpt-6-luna` through Portkey (`PORTKEY_API_KEY`). Every call is logged to `logs/usage.jsonl` and shown in the **Agent Log & Costs** tab.

## Files

- `app.py`: Flask routes
- `agents.py`: agents, tools, safety checks and token logging
- `sources.py`: verified library, RSS feeds and module content
- `templates/`, `static/`: the interface
- `report.html`, `slides.html`: project report and slides
