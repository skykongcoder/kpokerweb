from PIL import Image

def find_cards(image_path):
    # This is a heuristic approach to find the cards
    img = Image.open(image_path)
    img = img.convert("RGB")
    width, height = img.size
    
    # We will look for horizontal rows of cards
    # The cards have distinct colors. The background is white (e.g., > 240, 240, 240).
    pixels = img.load()
    
    def is_bg(x, y):
        r, g, b = pixels[x, y]
        # Allow slight gray/off-white background
        return r > 240 and g > 240 and b > 240

    # Let's find rows by scanning horizontally
    # A row of cards will have many non-bg pixels
    row_density = []
    for y in range(height):
        non_bg_count = 0
        for x in range(width):
            if not is_bg(x, y):
                non_bg_count += 1
        row_density.append(non_bg_count)
    
    # Threshold for a row containing cards: at least 30% non-bg
    # Cards span a certain height.
    rows = []
    in_row = False
    start_y = 0
    for y in range(height):
        if row_density[y] > width * 0.05:
            if not in_row:
                in_row = True
                start_y = y
        else:
            if in_row:
                in_row = False
                end_y = y
                if end_y - start_y > 100: # Has to be tall enough to be a card row
                    rows.append((start_y, end_y))
    
    # Now for each row, find the cards horizontally
    cards = []
    for (start_y, end_y) in rows:
        y_mid = (start_y + end_y) // 2
        in_col = False
        start_x = 0
        
        # Check columns within this row
        col_density = []
        for x in range(width):
            non_bg_count = 0
            for y in range(start_y, end_y):
                if not is_bg(x, y):
                    non_bg_count += 1
            col_density.append(non_bg_count)
            
        for x in range(width):
            if col_density[x] > (end_y - start_y) * 0.3:
                if not in_col:
                    in_col = True
                    start_x = x
            else:
                if in_col:
                    in_col = False
                    end_x = x
                    if end_x - start_x > 50: # Wide enough
                        cards.append((start_x, start_y, end_x, end_y))
                        
    return cards, img

cards, img = find_cards("public/full_screenshot.png")

# Filter out non-card things (like headers, banners)
# We expect cards to have a similar aspect ratio (width/height ~ 0.7 to 0.9)
# and we expect around 13 of them.
filtered_cards = []
for c in cards:
    w = c[2] - c[0]
    h = c[3] - c[1]
    aspect = w / h
    if 0.5 < aspect < 1.2 and w > 100 and h > 150:
        filtered_cards.append(c)

print(f"Found {len(filtered_cards)} cards.")

# Save them
for i, bbox in enumerate(filtered_cards):
    card_img = img.crop(bbox)
    card_img.save(f"public/game_{i+1}.png")
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    print(f"Saved game_{i+1}.png ({w}x{h})")

