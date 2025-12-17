import os

def split_migration():
    print("Splitting migration file...")
    
    # Read the generated values from the generator script logic
    # (Re-reading the CSV is safer/easier than parsing the SQL)
    import csv
    
    values = []
    with open('dawaai_medicines_cleaned_final.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            brand = row['brand_name'].replace("'", "''")
            generic = row['generic_name'].replace("'", "''")
            mfg = row['manufacturer'].replace("'", "''")
            strength = row['strength'].replace("'", "''")
            form = row['dosage_form'].lower().replace("'", "''")
            pack = row['pack_size'].replace("'", "''")
            
            strength_val = f"'{strength}'" if strength else "NULL"
            form_val = f"'{form}'" if form else "NULL"
            pack_val = f"'{pack}'" if pack else "NULL"
            
            value = f"('{brand}', '{generic}', '{mfg}', {strength_val}, {form_val}, {pack_val})"
            values.append(value)
            
    total_records = len(values)
    chunk_size = 1000
    
    print(f"Total records: {total_records}")
    print(f"Chunk size: {chunk_size}")
    
    # Base header
    base_header = """-- Migration: Import Scraped Dawaai.pk Medicines (Part {part})
INSERT INTO medicine_reference (brand_name, generic_name, manufacturer, strength, dosage_form, standard_packaging)
VALUES
"""
    
    # Footer
    footer = "\nON CONFLICT (brand_name, strength) DO NOTHING;"
    
    # Part 1 Header (includes schema change)
    part1_header = """-- Migration: Import Scraped Dawaai.pk Medicines (Part 1)
-- Description: Drop constraint and start import

-- Drop the restrictive check constraint
ALTER TABLE medicine_reference DROP CONSTRAINT IF EXISTS medicine_reference_dosage_form_check;

INSERT INTO medicine_reference (brand_name, generic_name, manufacturer, strength, dosage_form, standard_packaging)
VALUES
"""

    for i in range(0, total_records, chunk_size):
        chunk = values[i:i + chunk_size]
        part_num = (i // chunk_size) + 1
        
        filename = f"migration_v19_part{part_num}.sql"
        
        header = part1_header if part_num == 1 else base_header.format(part=part_num)
        
        content = header + ",\n".join(chunk) + footer
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Created {filename} ({len(chunk)} records)")

if __name__ == '__main__':
    split_migration()
