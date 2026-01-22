from PIL import Image
import os
import numpy as np

source_path = "public/categories/sprite.png"
output_dir = "public/categories"

def is_background(pixel):
    # Check if pixel is white or transparent
    # pixel is (R, G, B, A) or (R, G, B)
    if len(pixel) == 4:
        if pixel[3] < 10: # Transparent
            return True
        # If not transparent, check if white
        return pixel[0] > 240 and pixel[1] > 240 and pixel[2] > 240
    else:
        # Check if white
        return pixel[0] > 240 and pixel[1] > 240 and pixel[2] > 240

def smart_crop():
    if not os.path.exists(source_path):
        print("Source not found")
        return

    img = Image.open(source_path).convert("RGBA")
    width, height = img.size
    pixels = np.array(img)
    
    # Create a binary mask: 1 for content, 0 for background
    # This is rough but should work for "buttons on white"
    # We'll check if R,G,B < 240 (roughly non-white)
    # And A > 10 (roughly non-transparent)
    
    # Vectorized check
    r = pixels[:,:,0]
    g = pixels[:,:,1]
    b = pixels[:,:,2]
    a = pixels[:,:,3]
    
    # White: R>240 & G>240 & B>240
    is_white = (r > 230) & (g > 230) & (b > 230) # Slightly lower threshold to catch off-whites
    
    # Make white pixels transparent
    pixels[is_white, 3] = 0
    
    # Create new image with transparency
    img_transparent = Image.fromarray(pixels)

    # Re-calculate detection based on Transparency ONLY now (since we just set bg to trans)
    # Content is where Alpha > 0
    has_content = pixels[:,:,3] > 0
    
    # 1. Detect Rows (Vertical separators)
    # Project to Y axis
    row_content = np.any(has_content, axis=1) # True if row has content
    
    # Find gaps in rows
    # We expect 2 rows of items.
    # Simple state machine to find start/end of content rows
    rows_found = []
    in_row = False
    start_y = 0
    
    for y, has_pixels in enumerate(row_content):
        if has_pixels and not in_row:
            in_row = True
            start_y = y
        elif not has_pixels and in_row:
            in_row = False
            rows_found.append((start_y, y))
    
    if in_row:
        rows_found.append((start_y, height))
        
    print(f"Found {len(rows_found)} content rows: {rows_found}")
    
    # 2. For each row, detect Cols (Horizontal separators)
    icon_count = 0
    final_crops = [] # (r, c, path)
    
    for r_idx, (y1, y2) in enumerate(rows_found):
        row_slice = has_content[y1:y2, :]
        col_content = np.any(row_slice, axis=0)
        
        cols_found = []
        in_col = False
        start_x = 0
        
        for x, has_pixels in enumerate(col_content):
            if has_pixels and not in_col:
                in_col = True
                start_x = x
            elif not has_pixels and in_col:
                in_col = False
                cols_found.append((start_x, x))
        
        if in_col:
            cols_found.append((start_x, width))
            
        print(f"Row {r_idx}: Found {len(cols_found)} items: {cols_found}")
        
        for c_idx, (x1, x2) in enumerate(cols_found):
            # Crop with a tiny padding if possible, or just exact
            # Let's add 2px padding
            pad = 2
            cx1 = max(0, x1 - pad)
            cy1 = max(0, y1 - pad)
            cx2 = min(width, x2 + pad)
            cy2 = min(height, y2 + pad)
            
            crop = img_transparent.crop((cx1, cy1, cx2, cy2))
            
            # Save
            filename = f"smart_icon_{r_idx}_{c_idx}.png"
            save_path = os.path.join(output_dir, filename)
            crop.save(save_path)
            final_crops.append(filename)
            print(f"Saved {filename}")

if __name__ == "__main__":
    smart_crop()
