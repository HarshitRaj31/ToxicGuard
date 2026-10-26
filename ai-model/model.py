import joblib
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent

model = joblib.load(MODEL_DIR / "toxic_model.pkl")
vectorizer = joblib.load(MODEL_DIR / "vectorizer.pkl")


labels = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate"
]


category_map = {
    "toxic": "Toxic",
    "severe_toxic": "Toxic",
    "obscene": "Offensive",
    "threat": "Threat",
    "insult": "Insult",
    "identity_hate": "Hate Speech"
}


# Higher number = higher priority
priority = {
    "threat": 6,
    "identity_hate": 5,
    "severe_toxic": 4,
    "toxic": 3,
    "obscene": 2,
    "insult": 1
}

def predict_text(text):

    X = vectorizer.transform([text])

    probabilities = model.predict_proba(X)[0]

    detected_labels = []

    for label, probability in zip(labels, probabilities):

        if probability >= 0.50:
            detected_labels.append(label)

    # No toxic labels detected
    if not detected_labels:

        highest_probability = max(probabilities)

        return {
            "result": "Safe",
            "category": "Non-Toxic",
            "confidence": round(
                (1 - highest_probability) * 100,
                2
            ),
            "detectedLabels": []
        }

    # Find strongest detected label
    strongest_index = max(
        range(len(probabilities)),
        key=lambda i: probabilities[i]
    )

    strongest_label = labels[strongest_index]

    category = category_map[strongest_label]

    confidence = probabilities[strongest_index] * 100

    return {
        "result": category,
        "category": category,
        "confidence": round(confidence, 2),
        "detectedLabels": detected_labels
    }
