#!/usr/bin/env python3
"""
Genera iconos de launcher Android desde la foto del equipo
Con fondo oscuro (#0A1628) para coincidir con el icono de Play Store
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

# Fondo oscuro igual al icono de Play Store
BG_COLOR = (10, 22, 40)  # #0A1628

SOURCE = os.path.join(os.path.dirname(__file__), "..", "public", "team.png.png")
ANDROID_RES = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "res")

def create_icons():
    img = Image.open(SOURCE)
    
    for density, px in SIZES.items():
        # Crear lienzo cuadrado con fondo oscuro
        canvas = Image.new("RGB", (px, px), BG_COLOR)
        
        # Calcular tamano de la foto con margen (80% del tamano total)
        photo_size = int(px * 0.8)
        ratio = min(photo_size / img.width, photo_size / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        
        resized = img.resize((new_w, new_h), Image.LANCZOS)
        
        # Centrar en el lienzo
        x = (px - new_w) // 2
        y = (px - new_h) // 2
        canvas.paste(resized, (x, y))
        
        folder = os.path.join(ANDROID_RES, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        
        # Icono normal
        path_normal = os.path.join(folder, "ic_launcher.png")
        canvas.save(path_normal, "PNG")
        print(f"  {density}: {path_normal}")
        
        # Icono round
        path_round = os.path.join(folder, "ic_launcher_round.png")
        canvas.save(path_round, "PNG")
        print(f"  {density}: {path_round}")
    
    # Foreground para icono adaptativo (512x512)
    fg_canvas = Image.new("RGB", (512, 512), BG_COLOR)
    photo_size_fg = int(512 * 0.8)
    ratio_fg = min(photo_size_fg / img.width, photo_size_fg / img.height)
    new_w_fg = int(img.width * ratio_fg)
    new_h_fg = int(img.height * ratio_fg)
    resized_fg = img.resize((new_w_fg, new_h_fg), Image.LANCZOS)
    x_fg = (512 - new_w_fg) // 2
    y_fg = (512 - new_h_fg) // 2
    fg_canvas.paste(resized_fg, (x_fg, y_fg))
    
    fg_drawable_path = os.path.join(ANDROID_RES, "drawable-v24", "ic_launcher_foreground.png")
    os.makedirs(os.path.dirname(fg_drawable_path), exist_ok=True)
    fg_canvas.save(fg_drawable_path, "PNG")
    print(f"  foreground drawable: {fg_drawable_path}")
    
    # También copiar foreground a cada carpeta mipmap
    for density in SIZES:
        folder = os.path.join(ANDROID_RES, f"mipmap-{density}")
        fg_mipmap_path = os.path.join(folder, "ic_launcher_foreground.png")
        fg_canvas.save(fg_mipmap_path, "PNG")
        print(f"  foreground mipmap-{density}: {fg_mipmap_path}")
    
    print("\nIconos generados correctamente")

if __name__ == "__main__":
    create_icons()
