
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import * as faceapi from "@vladmandic/face-api";
import "./Login.css";

const FaceLogin = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const { faceLogin } = useAuth();

  const [message, setMessage] = useState(
    "Loading face recognition models..."
  );
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

   
const loadModels = async () => {
  const models = [
    [
      "SSD MobileNet",
      faceapi.nets.ssdMobilenetv1,
    ],
    [
      "Face Landmark",
      faceapi.nets.faceLandmark68Net,
    ],
    [
      "Face Recognition",
      faceapi.nets.faceRecognitionNet,
    ],
  ];

  try {
    for (const [name, model] of models) {
      setMessage(`Loading ${name} model...`);
      console.log(`Loading ${name} model...`);

      await model.loadFromUri("/models");

      console.log(`${name} model loaded successfully.`);
    }

    setModelsReady(true);
    setMessage("All face models loaded. Start your camera.");
  } catch (error) {
    console.error("Failed face model:", error);
    setMessage(
      `Model loading failed: ${error.message || "Check the console."}`
    );
  }
};
loadModels();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!modelsReady) {
        setMessage("Please wait for the models to finish loading.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera access requires localhost or HTTPS.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraReady(true);
      setMessage("Camera ready. Look directly at the camera.");
    } catch (error) {
      console.error("Camera startup error:", error);
      setMessage(
        "Unable to access the camera. Check camera permissions and try again."
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  };

  const handleFaceLogin = async () => {
    if (!cameraReady || !videoRef.current || loading) {
      setMessage("Start the camera before verifying your face.");
      return;
    }

    setLoading(true);
    setMessage("Detecting your face...");

    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.SsdMobilenetv1Options()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage("No clear face detected. Face the camera and try again.");
        return;
      }

      setMessage("Verifying your enrolled admin face...");

      const authenticatedUser = await faceLogin(
        Array.from(detection.descriptor)
      );

      if (authenticatedUser?.role !== "admin") {
        throw new Error("This account is not authorized for admin access.");
      }

      stopCamera();
      navigate("/admin", { replace: true });
    } catch (error) {
      console.error("Face login error:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Face login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🛡️</div>

        <h1>Admin Face Login</h1>

        <p className="login-subtitle">
          Look at the camera to verify your enrolled admin face.
        </p>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            display: "block",
            width: "100%",
            maxWidth: "420px",
            borderRadius: "12px",
            background: "#111",
            margin: "12px auto",
          }}
        />

        <p className="login-message" role="status">
          {message}
        </p>

        {!cameraReady ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={!modelsReady || loading}
          >
            {modelsReady ? "Start Camera" : "Loading Face Models..."}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleFaceLogin}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Face & Login"}
            </button>

            <button
              type="button"
              onClick={stopCamera}
              disabled={loading}
              style={{ marginTop: "10px" }}
            >
              Stop Camera
            </button>
          </>
        )}

        <p className="register-prompt">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default FaceLogin;
