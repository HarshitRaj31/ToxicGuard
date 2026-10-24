import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import classification_report


# 1. Load dataset
print("Loading dataset...")

df = pd.read_csv("train.csv")

print("Dataset loaded!")
print("Total comments:", len(df))


# 2. Select text and labels
X = df["comment_text"].fillna("")

labels = [
    "toxic",
    "severe_toxic",
    "obscene",
    "threat",
    "insult",
    "identity_hate"
]

y = df[labels].fillna(0)


# 3. Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))


# 4. Convert text into TF-IDF features
print("Creating TF-IDF features...")

vectorizer = TfidfVectorizer(
    lowercase=True,
    stop_words="english",
    max_features=50000,
    ngram_range=(1, 2)
)

X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

print("TF-IDF completed!")


# 5. Create multi-label model
print("Training model...")

model = OneVsRestClassifier(
    LogisticRegression(
        max_iter=1000
    )
)

model.fit(X_train_tfidf, y_train)

print("Model training completed!")


# 6. Evaluate model
print("Evaluating model...")

y_pred = model.predict(X_test_tfidf)

print(
    classification_report(
        y_test,
        y_pred,
        target_names=labels,
        zero_division=0
    )
)


# 7. Save model
joblib.dump(model, "toxic_model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model saved successfully!")
print("Created:")
print(" - toxic_model.pkl")
print(" - vectorizer.pkl")