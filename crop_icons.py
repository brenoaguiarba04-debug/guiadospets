from PIL import Image
import os

# Source is the uploaded sprite
source_path = "public/categories/sprite.png"
output_dir = "public/categories"

try:
    if not os.path.exists(source_path):
        print(f"Error: Source file {source_path} not found.")
        exit(1)

    img = Image.open(source_path)
    width, height = img.size
    
    # Grid: 2 rows, 5 columns
    rows = 2
    cols = 5
    
    cell_width = width // cols
    cell_height = height // rows
    
    print(f"Image size: {width}x{height}")
    print(f"Cell size: {cell_width}x{cell_height}")
    
    # Mapping based on visual inspection
    # R0C0: Dog Food
    # R0C1: Dog Hygiene
    # R0C2: Dog Health
    # R0C3: Dog Accesssories/Food?
    # R0C4: Dog Acc?
    
    # Let's save all 10 as index to be safe and then rename or use mapping.
    count = 0
    for r in range(rows):
        for c in range(cols):
            left = c * cell_width
            top = r * cell_height
            right = left + cell_width
            bottom = top + cell_height
            
            crop = img.crop((left, top, right, bottom))
            
            # Save as icon_r_c.png
            filename = f"icon_{r}_{c}.png"
            save_path = os.path.join(output_dir, filename)
            crop.save(save_path)
            print(f"Saved {save_path}")
            count += 1

    print("Done.")

except Exception as e:
    print(f"Error: {e}")
