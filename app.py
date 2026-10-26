"""SOM AI Core Curriculum Builder - Flask entry point.

Run:  python app.py   then open http://localhost:5050
"""
import json
import os

from flask import Flask, jsonify, render_template, request

import agents
from sources import FEEDS, LIBRARY, MODULES, NO_FEED_SOURCES

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", modules=MODULES, library=LIBRARY, feeds=FEEDS,
                           no_feed=NO_FEED_SOURCES, has_key=agents.has_key(), model=agents.MODEL)


@app.route("/api/news")
def api_news():
    force = request.args.get("refresh") == "1"
    trace = []
    try:
        data = agents.curate_news(force=force, trace=trace)
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500
    return jsonify({**data, "trace": trace})


@app.route("/api/build", methods=["POST"])
def api_build():
    if not agents.has_key():
        return jsonify({"error": "No PORTKEY_API_KEY found. Add it to a .env file in this folder (see README), then restart the app."}), 400
    try:
        result = agents.run_pipeline(request.get_json(force=True) or {})
    except agents.LLMError as ex:
        return jsonify({"error": str(ex)}), 502
    except Exception as ex:
        return jsonify({"error": "Unexpected error: " + str(ex)[:200]}), 500
    (agents.LOG_DIR / "last_run.json").write_text(json.dumps(result, indent=2))
    return jsonify(result)


@app.route("/api/usage")
def api_usage():
    return jsonify(agents.usage_summary())


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5050"))
    print("\n  SOM AI Core Curriculum Builder running at http://localhost:{}\n".format(port))
    app.run(host="127.0.0.1", port=port, debug=False)
