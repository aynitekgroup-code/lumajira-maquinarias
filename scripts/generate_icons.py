#!/usr/bin/env python3
"""
Genera iconos de launcher Android desde la foto del equipo
"""
from PIL import Image
import os

# Tamanos de launcher por densidad
SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

SOURCE = os.path.join(os.path.dirname(__file__), "..", "public", "team.png.png")
ANDROID_RES = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")

def create_icons():
    img = Image.open(SOURCE)
    
    # Convertir a cuadrado recortando al centro
    w, h = img.size
    size = min(w, h)
    left = (w - size) // 2
    top = (h - size) // 2
    img = img.crop((left, top, left + size, top + size))
    
    for density, px in SIZES.items():
        resized = img.resize((px, px), Image.LANCZOS)
        
        folder = os.path.join(ANDROID_RES, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        
        # Icono normal
        path_normal = os.path.join(folder, "ic_launcher.png")
        resized.save(path_normal, "PNG")
        print(f"  {density}: {path_normal}")
        
        # Icono round
        path_round = os.path.join(folder, "ic_launcher_round.png")
        resized.save(path_round, "PNG")
        print(f"  {density}: {path_round}")
    
    # Foreground para icono adaptativo (512x512)
    fg = img.resize((512, 512), Image.LANCZOS)
    fg_path = os.path.join(ANDROID_RES, "drawable-v24", "ic_launcher_foreground.png")
    os.makedirs(os.path.dirname(fg_path), exist_ok=True)
    fg.save(fg_path, "PNG")
    print(f"  foreground: {fg_path}")
    
    print("\nIconos generados correctamente")

if __name__ == "__main__":
    create_icons()
