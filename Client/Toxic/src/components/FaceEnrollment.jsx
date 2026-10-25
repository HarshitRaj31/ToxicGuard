
import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import API_BASE_URL from "../api";
import "./FaceEnrollment.css"

const MODEL_URL = "/models";

export default function FaceEnrollment() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [modelReady, setModelReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState("Loading face detection models...");
  const [descriptor, setDescriptor] = useState(null);
const [verificationResult, setVerificationResult] = useState("");
const [consent, setConsent] = useState(false);
const [saving, setSaving] = useState(false);
const [isEnrolled, setIsEnrolled] = useState(false);
const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    let active = true;

  
async function loadModels() {
  const models = [
    {
      name: "Tiny Face Detector",
      load: () =>
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    },
    {
      name: "Face Landmark 68",
      load: () =>
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    },
    {
      name: "Face Recognition",
      load: () =>
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    },
  ];

  try {
    for (const model of models) {
      if (active) {
        setStatus(`Loading ${model.name}...`);
      }

      await model.load();
      console.log(`${model.name} loaded successfully`);
    }

    if (active) {
      setModelReady(true);
      setStatus("All face models loaded. Start your camera.");
    }
  } catch (error) {
    console.error("Face model loading failed:", error);

    if (active) {
      setStatus("Model loading failed. Open F12 → Console for details.");
    }
  }
}


    loadModels();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
async function checkEnrollmentStatus() {
  const token = localStorage.getItem("token");

  if (!token) {
    setIsEnrolled(false);
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/face/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to check face enrollment."
      );
    }

    setIsEnrolled(data.enrolled);
  } catch (error) {
    console.error("Enrollment status check failed:", error);
    setStatus("Unable to check saved face enrollment.");
  }
}
  
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus(
      "Camera is unavailable. Use localhost or HTTPS and a supported browser."
    );
    return;
  }

  if (!videoRef.current) {
    setStatus("Camera preview is not ready. Please refresh and try again.");
    return;
  }

  try {
    setStatus("Requesting camera permission...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    await videoRef.current.play();

    setCameraReady(true);
    setStatus("Camera ready. Position your face in the frame.");
  } catch (error) {
    // Release any stream if startup fails partway through.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
    console.error("Camera access failed:", error);

    if (error.name === "NotAllowedError") {
      setStatus("Camera permission denied. Allow camera access in your browser settings.");
    } else if (error.name === "NotFoundError") {
      setStatus("No camera was found on this device.");
    } else if (error.name === "NotReadableError") {
      setStatus("The camera may be in use by another application. Close it and try again.");
    } else {
      setStatus("Could not start the camera. Check permissions and try again.");
    }
  }
}


  async function enrollFace() {
    if (!videoRef.current || !modelReady || !cameraReady) return;

    try {
      setStatus("Processing your face locally...");

      const result = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        setStatus("No face detected. Improve the lighting and try again.");
        return;
      }

      // The descriptor stays in component memory for now.
      // We are not uploading or storing any face image.
      setDescriptor(Array.from(result.descriptor));
      setStatus("Face enrolled locally for this session.");
    } catch (error) {
      console.error("Face enrollment failed:", error);
      setStatus("Could not process your face. Please try again.");
    }
  }


async function verifyFace() {
  if (!videoRef.current || !modelReady || !cameraReady || !descriptor) {
    setVerificationResult(
      "Enroll a face first and keep the camera running."
    );
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    setVerificationResult("Please log in again.");
    return;
  }

  try {
    setVerificationResult("Checking your face...");

    const result = await faceapi
      .detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) {
      setVerificationResult(
        "No face detected. Try again with better lighting."
      );
      return;
    }

    const response = await fetch(`${API_BASE_URL}/face/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        descriptor: Array.from(result.descriptor),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Face verification failed.");
    }

    setVerificationResult(data.message);
  } catch (error) {
    console.error("Face verification failed:", error);
    setVerificationResult(
      error.message || "Verification failed. Please try again."
    );
  }
}


async function saveEnrollment() {
  if (!descriptor) {
    setStatus("Enroll your face locally before saving.");
    return;
  }

  if (!consent) {
    setStatus("Please consent before saving your face template.");
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    setStatus("Please log in again before enrolling.");
    return;
  }

  try {
    setSaving(true);
    setStatus("Encrypting and saving your face template...");

    const response = await fetch(`${API_BASE_URL}/face/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        descriptor,
        consent: true,
        modelVersion: "face-api-128-v1",
      }),
    });

    const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || "Unable to save face enrollment.");
}

setIsEnrolled(true);
setStatus("Encrypted face template saved successfully.");
  } catch (error) {
    console.error("Saving face enrollment failed:", error);
    setStatus(error.message || "Unable to save face enrollment.");
  } finally {
    setSaving(false);
  }
}
async function deleteSavedEnrollment() {
  const token = localStorage.getItem("token");

  if (!token) {
    setStatus("Please log in again.");
    return;
  }

  const confirmed = window.confirm(
    "Delete your saved face template? This cannot be undone."
  );

  if (!confirmed) return;

  try {
    setDeleting(true);

    const response = await fetch(
`${API_BASE_URL}/face/enroll`,{
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to delete saved face data."
      );
    }

    setIsEnrolled(false);
    setDescriptor(null);
    setVerificationResult("");
    setStatus("Saved face template deleted successfully.");
  } catch (error) {
    console.error("Face deletion failed:", error);
    setStatus(error.message || "Unable to delete saved face data.");
  } finally {
    setDeleting(false);
  }
}
  function clearEnrollment() {
    setDescriptor(null);
    setStatus("Local enrollment cleared.");
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
    setStatus("Camera stopped.");
  }

  return (
    <section className="face-enrollment">
      <h2>Face Enrollment</h2>
      
        <p>
  Your camera image is processed locally in your browser and is not uploaded.
  If you choose to save your enrollment, a face descriptor is sent to the
  backend and stored encrypted for verification. You can delete your saved
  enrollment when you no longer want to use it.
</p>
      

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Camera preview for face enrollment"
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          background: "#111827",
        }}
      />
<div className="face-enrollment__message" role="status">
  {!modelReady && (
    <span className="face-enrollment__spinner" aria-hidden="true" />
  )}
  <span>{status}</span>
</div>

{verificationResult && (
  <p role="status">{verificationResult}</p>
)}
<div className="face-enrollment__status">
  <span>Saved enrollment</span>

  <span
    className={`face-enrollment__badge ${
      isEnrolled ? "is-enrolled" : "is-not-enrolled"
    }`}
  >
    <span className="face-enrollment__status-dot" />
    {isEnrolled ? "Enrolled" : "Not enrolled"}
  </span>
</div>
<label>
  <input
    type="checkbox"
    checked={consent}
    onChange={(e) => setConsent(e.target.checked)}
  />
  I consent to storing an encrypted face template for verification.
</label>
      <div className="face-enrollment__actions">
        <button onClick={startCamera} disabled={!modelReady || cameraReady}>
          Start Camera
        </button>

        <button
          onClick={enrollFace}
          disabled={!modelReady || !cameraReady}
        >
          Enroll Face
        </button>

        <button onClick={stopCamera} disabled={!cameraReady}>
          Stop Camera
        </button>

        <button onClick={clearEnrollment} disabled={!descriptor}>
          Clear Enrollment
        </button>
        <button
  onClick={verifyFace}
  disabled={!modelReady || !cameraReady || !descriptor}
>
  Verify Face
</button>
<button
  type="button"
  onClick={saveEnrollment}
  disabled={!descriptor || !consent || saving}
>
  {saving ? (
    <>
      <span
        className="face-enrollment__spinner"
        aria-hidden="true"
      />
      Saving enrollment...
    </>
  ) : (
    "Save Enrollment"
  )}
</button>
<button
  type="button"
  onClick={deleteSavedEnrollment}
  disabled={!isEnrolled || deleting}
>
  {deleting ? "Deleting..." : "Delete Saved Face Data"}
</button>
      </div>

      {descriptor && (
        <p>
          Face descriptor generated successfully. It is held in memory only;
          it will be lost when this component is closed or refreshed.
        </p>
      )}
    </section>
  );
}
