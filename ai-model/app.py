from flask import Flask, request, jsonify
from flask_cors import CORS

from model import predict_text

app = Flask(__name__)

CORS(app)


@app.route("/")
def home():
    return jsonify({
        "message": "Toxic Speech AI Service is running"
    })


@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({
            "message": "Text is required"
        }), 400

    text = data["text"].strip()

    if not text:
        return jsonify({
            "message": "Text cannot be empty"
        }), 400

    result = predict_text(text)

    return jsonify(result)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True
    )