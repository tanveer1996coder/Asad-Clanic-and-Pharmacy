import csv
import re

def clean_brand_name(brand, strength, form):
    """
    Clean brand name by removing strength, form, and pack info
    """
    clean = brand
    
    # Remove form (case insensitive)
    if form:
        clean = re.sub(r'\b' + re.escape(form) + r'\b', '', clean, flags=re.IGNORECASE)
    
    # Remove strength (case insensitive)
    if strength:
        # Remove exact strength match
        clean = re.sub(r'\b' + re.escape(strength) + r'\b', '', clean, flags=re.IGNORECASE)
        # Remove strength with/without space variation
        alt_strength = strength.replace(' ', '') if ' ' in strength else strength.replace('mg', ' mg')
        clean = re.sub(r'\b' + re.escape(alt_strength) + r'\b', '', clean, flags=re.IGNORECASE)
        
    # Remove common patterns
    patterns = [
        r'\d+\s*x\s*\d+\'?s?',   # 20x10's
        r'\d+\'?s',              # 10's
        r'\d+mg',                # 500mg
        r'\d+\s+mg',             # 500 mg
        r'\d+ml',                # 100ml
        r'\d+\s+ml',             # 100 ml
        r'\d+gm',                # 1gm
        r'\d+\s+gm',             # 1 gm
        r'\bTablet\b', r'\bCapsule\b', r'\bSyrup\b', r'\bInjection\b', 
        r'\bSuspension\b', r'\bDrops\b', r'\bCream\b', r'\bOintment\b',
        r'\bGel\b', r'\bSachet\b', r'\bSolution\b'
    ]
    
    for pattern in patterns:
        clean = re.sub(pattern, '', clean, flags=re.IGNORECASE)
        
    # Remove trailing/leading special chars and spaces
    clean = re.sub(r'^\W+|\W+$', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    
    return clean

def clean_data():
    print("Cleaning data...")
    
    cleaned_rows = []
    
    with open('dawaai_medicines_final.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # 1. Standardize Form (Title Case)
            form = row['dosage_form'].strip().title()
            
            # 2. Standardize Strength (remove space)
            strength = row['strength'].strip().lower().replace(' ', '')
            
            # 3. Clean Brand Name
            original_brand = row['brand_name'].strip()
            clean_brand = clean_brand_name(original_brand, strength, form)
            
            # If cleaning resulted in empty string (rare), keep original
            if not clean_brand:
                clean_brand = original_brand
                
            # MERGE: Append strength to brand name for clarity
            # But only if strength is present
            final_brand_name = clean_brand
            if strength:
                final_brand_name = f"{clean_brand} {strength}"
            
            # 4. Standardize Manufacturer (Title Case)
            manufacturer = row['manufacturer'].strip()
            
            cleaned_rows.append({
                'brand_name': final_brand_name,
                'generic_name': row['generic_name'].strip(),
                'manufacturer': manufacturer,
                'strength': strength,
                'dosage_form': form,
                'pack_size': row['pack_size'].strip(),
                'original_brand_name': original_brand # Keep original for reference
            })
            
    # Save cleaned data
    output_file = 'dawaai_medicines_cleaned_final.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['brand_name', 'generic_name', 'manufacturer', 'strength', 'dosage_form', 'pack_size', 'original_brand_name']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cleaned_rows)
        
    print(f"✓ Successfully cleaned {len(cleaned_rows)} medicines")
    print(f"  Saved to: {output_file}")
    
    # Show samples
    print("\nSample Cleaned Data:")
    for row in cleaned_rows[:10]:
        print(f"  Original: {row['original_brand_name']}")
        print(f"  Cleaned:  {row['brand_name']}")
        print(f"  Form:     {row['dosage_form']}")
        print(f"  Strength: {row['strength']}")
        print("-" * 30)

if __name__ == '__main__':
    clean_data()
