from PIL import Image
import os

def create_favicon(source_path, output_path, size=(192, 192)):
    try:
        img = Image.open(source_path)
        print(f"Original size: {img.size}")
        
        # Calculate aspect ratio
        ratio = min(size[0] / img.width, size[1] / img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        
        # Resize maintaining aspect ratio
        img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Create a new square image with white background (or transparent if source is transparent)
        # Using RGBA for transparency support
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
             new_img = Image.new("RGBA", size, (255, 255, 255, 0)) # Transparent background
        else:
             new_img = Image.new("RGB", size, (255, 255, 255))
        
        # Paste centered
        paste_x = (size[0] - new_size[0]) // 2
        paste_y = (size[1] - new_size[1]) // 2
        new_img.paste(img, (paste_x, paste_y), img if img.mode == 'RGBA' else None)
        
        new_img.save(output_path, "PNG")
        print(f"Favicon saved to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_favicon('public/logo.png', 'public/favicon-generated.png')
