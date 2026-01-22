from PIL import Image
import os

source_path = r"C:/Users/breno/.gemini/antigravity/brain/b443c1f7-63d6-458e-a038-c3ab17a8e245/uploaded_image_1769037705895.png"
output_dir = "public/categories"

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

try:
    img = Image.open(source_path)
    width, height = img.size
    
    # Grid dimensions
    rows = 2
    cols = 5
    
    # Calculate cell size
    cell_width = width // cols
    cell_height = height // rows
    
    icons = []
    
    for r in range(rows):
        for c in range(cols):
            left = c * cell_width
            top = r * cell_height
            right = left + cell_width
            bottom = top + cell_height
            
            # Crop
            crop = img.crop((left, top, right, bottom))
            
            # Save temp to identify
            filename = f"temp_icon_{r}_{c}.png"
            crop.save(os.path.join(output_dir, filename))
            icons.append(filename)
            print(f"Saved {filename}")

except Exception as e:
    print(f"Error: {e}")
