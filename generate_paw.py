from PIL import Image, ImageDraw

def create_paw_icon(output_path, size=(192, 192), bg_color=(107, 33, 168), fg_color=(255, 255, 255)):
    # Create new image with transparent background
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw Background Circle (Purple)
    # Leave a small margin for smoothness
    margin = 8
    draw.ellipse([margin, margin, size[0]-margin, size[1]-margin], fill=bg_color)
    
    # Draw Paw (White)
    # Coordinates are relative to size 192x192
    center_x, center_y = size[0] // 2, size[1] // 2
    
    # Main Pad (Large, slightly lower)
    pad_w, pad_h = 70, 60
    pad_y_offset = 20
    draw.ellipse(
        [center_x - pad_w//2, center_y + pad_y_offset - pad_h//2, 
         center_x + pad_w//2, center_y + pad_y_offset + pad_h//2], 
        fill=fg_color
    )
    
    # Toe Pads (4 small circles)
    toe_size = 28
    toe_dist_y = 45 
    toe_dist_x_inner = 35
    toe_dist_x_outer = 65
    toe_y_offset = -20 # Shift toes up
    
    # Inner Toes
    draw.ellipse(
        [center_x - toe_dist_x_inner - toe_size//2, center_y + toe_y_offset - toe_dist_y - toe_size//2,
         center_x - toe_dist_x_inner + toe_size//2, center_y + toe_y_offset - toe_dist_y + toe_size//2],
        fill=fg_color
    )
    draw.ellipse(
        [center_x + toe_dist_x_inner - toe_size//2, center_y + toe_y_offset - toe_dist_y - toe_size//2,
         center_x + toe_dist_x_inner + toe_size//2, center_y + toe_y_offset - toe_dist_y + toe_size//2],
        fill=fg_color
    )
    
    # Outer Toes (slightly lower)
    outer_y_drop = 20
    draw.ellipse(
        [center_x - toe_dist_x_outer - toe_size//2, center_y + toe_y_offset - toe_dist_y + outer_y_drop - toe_size//2,
         center_x - toe_dist_x_outer + toe_size//2, center_y + toe_y_offset - toe_dist_y + outer_y_drop + toe_size//2],
        fill=fg_color
    )
    draw.ellipse(
        [center_x + toe_dist_x_outer - toe_size//2, center_y + toe_y_offset - toe_dist_y + outer_y_drop - toe_size//2,
         center_x + toe_dist_x_outer + toe_size//2, center_y + toe_y_offset - toe_dist_y + outer_y_drop + toe_size//2],
        fill=fg_color
    )

    img.save(output_path, "PNG")
    print(f"Paw favicon saved to {output_path}")

if __name__ == "__main__":
    create_paw_icon('public/favicon-generated.png')
