
import os

from flask import Flask, request, jsonify
from flask_cors import CORS

from model import predict_text

app = Flask(__name__)

# Limit incoming request size to 20 KB
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024

# Allow only the configured frontend origin
client_url = os.getenv("CLIENT_URL", "http://localhost:5173")
CORS(app, resources={r"/predict": {"origins": [client_url]}})


@app.route("/")
def home():
    return jsonify({
        "message": "Toxic Speech AI Service is running"
    })


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "message": "A valid JSON object is required."
        }), 400

    text = data.get("text")

    if not isinstance(text, str):
        return jsonify({
            "message": "Text must be a string."
        }), 400

    text = text.strip()

    if not text:
        return jsonify({
            "message": "Text cannot be empty."
        }), 400

    if len(text) > 5000:
        return jsonify({
            "message": "Text cannot exceed 5000 characters."
        }), 400

    try:
        result = predict_text(text)
        return jsonify(result), 200
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({
            "message": "Unable to process the prediction."
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=False
    )
