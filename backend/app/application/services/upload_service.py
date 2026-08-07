"""
UploadService — Secure avatar upload handling.

Security measures:
- Magic bytes verification (not just file extension)
- File size limit (5 MB)
- UUID-based filenames (no path traversal via original name)
- Old file cleanup on replacement
- Pillow-based resize to max 512x512 (saves bandwidth, prevents zip-bombs)
"""
import os
import uuid
import io
from pathlib import Path
from typing import Optional

from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

# Magic bytes for allowed image types
_MAGIC: dict[str, bytes] = {
    "jpg":  b"\xff\xd8\xff",
    "jpeg": b"\xff\xd8\xff",
    "png":  b"\x89PNG",
    "webp": b"RIFF",
}

_MAX_SIZE = 5 * 1024 * 1024  # 5 MB
_MAX_DIM  = 512               # max width/height in pixels
_AVATAR_DIR = "avatars"


def _get_avatar_dir() -> Path:
    path = Path(settings.UPLOAD_DIR) / _AVATAR_DIR
    path.mkdir(parents=True, exist_ok=True)
    return path


def _detect_extension(data: bytes) -> Optional[str]:
    """Return file extension based on magic bytes, or None if unsupported."""
    for ext, magic in _MAGIC.items():
        if data[:len(magic)] == magic:
            return "jpg" if ext == "jpeg" else ext
    return None


class UploadService:

    @staticmethod
    async def save_avatar(file: UploadFile, old_foto: Optional[str] = None) -> str:
        """
        Validate, resize and save an uploaded avatar image.
        Returns the relative path to be stored in User.foto.
        Raises HTTPException on any validation failure.
        """
        # Read file into memory
        data = await file.read()

        # 1. Size check
        if len(data) > _MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Arquivo muito grande. Máximo permitido: 5 MB.",
            )

        # 2. Magic bytes check (ignore declared content-type — never trust client)
        ext = _detect_extension(data)
        if ext is None:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Tipo de arquivo não permitido. Use JPG, PNG ou WebP.",
            )

        # 3. Pillow open + resize (also validates it's a real image)
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(data))
            img.verify()  # detect truncated / corrupted files
            img = Image.open(io.BytesIO(data))  # reopen after verify()
            img = img.convert("RGB")
            img.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Arquivo de imagem inválido ou corrompido.",
            )

        # 4. Save with UUID filename
        filename = f"{uuid.uuid4()}.{ext}"
        dest = _get_avatar_dir() / filename

        out = io.BytesIO()
        fmt = "JPEG" if ext == "jpg" else ext.upper()
        img.save(out, format=fmt, quality=88, optimize=True)
        dest.write_bytes(out.getvalue())

        # 5. Remove old file if it existed
        if old_foto:
            UploadService.delete_avatar(old_foto)

        return f"{_AVATAR_DIR}/{filename}"

    @staticmethod
    def delete_avatar(foto_path: str) -> None:
        """Delete an avatar file safely (ignores missing files)."""
        try:
            full = Path(settings.UPLOAD_DIR) / foto_path
            if full.exists() and full.is_file():
                full.unlink()
        except Exception:
            pass  # Non-critical — log in production

    @staticmethod
    def get_url(foto_path: Optional[str]) -> Optional[str]:
        """Convert relative path to public URL."""
        if not foto_path:
            return None
        return f"/uploads/{foto_path}"
