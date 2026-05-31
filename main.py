from fastapi import FastAPI, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from PIL import Image
from dotenv import load_dotenv
import os
import tempfile
import shutil
import uuid
import requests
import io
from gradio_client import Client, handle_file

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

HF_TOKEN = os.environ.get("HF_TOKEN", "")
IDM_VTON_API = "yisol/IDM-VTON"

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.post("/tryon")
async def try_on(
    person_image: UploadFile = File(...),
    cloth_url: str = Form(default=None)
):
    temp_dir = None
    try:
        if not cloth_url or not cloth_url.strip():
            return {"status": "error", "message": "cloth_url is required"}

        if not person_image or person_image.size == 0:
            return {"status": "error", "message": "person_image is required"}

        temp_dir = tempfile.mkdtemp()

        person_image_path = os.path.join(temp_dir, "person_image.jpg")
        person_content = await person_image.read()
        img = Image.open(io.BytesIO(person_content))
        if img.mode in ("RGBA", "LA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            rgb_img.save(person_image_path, "JPEG", quality=95)
        else:
            img.convert("RGB").save(person_image_path, "JPEG", quality=95)

        cloth_image_path = os.path.join(temp_dir, "cloth_image.jpg")
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(cloth_url, headers=headers, timeout=30)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content))
        if img.mode in ("RGBA", "LA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            rgb_img.save(cloth_image_path, "JPEG", quality=95)
        else:
            img.convert("RGB").save(cloth_image_path, "JPEG", quality=95)

        client = Client(IDM_VTON_API, token=HF_TOKEN)
        result = client.predict(
            dict={
                "background": handle_file(person_image_path),
                "layers": [],
                "composite": None
            },
            garm_img=handle_file(cloth_image_path),
            garment_des="clothing item",
            is_checked=True,
            is_checked_crop=False,
            denoise_steps=30,
            seed=42,
            api_name="/tryon"
        )

        result_filename = f"{uuid.uuid4()}.png"
        shutil.copy(result[0], f"static/{result_filename}")
        result_image_path = f"/static/{result_filename}"

        return {"status": "success", "result_image": result_image_path}

    except Exception as e:
        return {"status": "error", "message": f"Failed: {str(e)}"}

    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
