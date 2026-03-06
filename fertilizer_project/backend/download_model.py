import gdown
import os

# ✅ Google Drive File ID for your model
DRIVE_FILE_ID = "1Xb7fEA9cjvgTSRqeh2xRjQHK_F97nHEU"

# ✅ Destination path (adjust if your folder structure is different)
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../ml_model")
MODEL_PATH = os.path.join(MODEL_DIR, "fertilizer_model.pkl")

# ✅ Create the directory if it doesn’t exist
os.makedirs(MODEL_DIR, exist_ok=True)

# ✅ Construct the download URL
url = f"https://drive.google.com/uc?id={DRIVE_FILE_ID}"

print(f"⬇️ Downloading model from {url} ...")

# ✅ Download the file using gdown
gdown.download(url, MODEL_PATH, quiet=False)

# ✅ Verify the download
if os.path.exists(MODEL_PATH):
    print(f"✅ Model successfully downloaded and saved at: {MODEL_PATH}")
else:
    print("❌ Download failed. Please check the file ID or your internet connection.")
