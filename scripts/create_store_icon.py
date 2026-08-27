#!/usr/bin/env python3
"""
Genera icono 512x512 para Play Store sin cortar los rostros
Agrega barras negras arriba y abajo para mantener la proporcion
"""
from PIL import Image
import os

SOURCE = os.path.join(os.path.dirname(__file__), "..", "public", "team.png.png")
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "public", "icon_512x512.png")

def create_icon():
    img = Image.open(SOURCE)
    w, h = img.size
    
    # Crear lienzo cuadrado 512x512 con fondo negro
    canvas = Image.new("RGB", (512, 512), (10, 22, 40))
    
    # Escalar imagen para que quepa en 512x512
    max_dim = 480
    ratio = min(max_dim / w, max_dim / h)
    new_w = int(w * ratio)
    new_h = int(h * ratio)
    
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    
    # Centrar en el lienzo
    x = (512 - new_w) // 2
    y = (512 - new_h) // 2
    canvas.paste(resized, (x, y))
    
    canvas.save(OUTPUT, "PNG")
    print(f"Icono generado: {OUTPUT}")
    print(f"Tamanio: {canvas.size}")

if __name__ == "__main__":
    create_icon()
