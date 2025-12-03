import csv

def generate_sql():
    print("Generating SQL migration...")
    
    sql_header = """-- Migration: Import Scraped Dawaai.pk Medicines
-- Date: 2025-12-03
-- Description: Import 15,000+ medicines into medicine_reference table

-- 1. Drop the restrictive check constraint on dosage_form to allow new forms (Suspension, Gel, etc.)
ALTER TABLE medicine_reference DROP CONSTRAINT IF EXISTS medicine_reference_dosage_form_check;

-- 2. Insert medicines
INSERT INTO medicine_reference (brand_name, generic_name, manufacturer, strength, dosage_form, standard_packaging)
VALUES
"""
    
    values = []
    
    with open('dawaai_medicines_cleaned_final.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Escape single quotes in text
            brand = row['brand_name'].replace("'", "''")
            generic = row['generic_name'].replace("'", "''")
            mfg = row['manufacturer'].replace("'", "''")
            strength = row['strength'].replace("'", "''")
            form = row['dosage_form'].lower().replace("'", "''") # Lowercase for consistency
            pack = row['pack_size'].replace("'", "''")
            
            # Handle empty fields
            strength_val = f"'{strength}'" if strength else "NULL"
            form_val = f"'{form}'" if form else "NULL"
            pack_val = f"'{pack}'" if pack else "NULL"
            
            # (brand, generic, mfg, strength, form, pack)
            value = f"('{brand}', '{generic}', '{mfg}', {strength_val}, {form_val}, {pack_val})"
            values.append(value)
            
    # Join all values with commas
    sql_values = ",\n".join(values)
    
    # Handle duplicates (ON CONFLICT DO NOTHING)
    # We have a unique constraint on (brand_name, strength)
    sql_footer = "\nON CONFLICT (brand_name, strength) DO NOTHING;"
    
    full_sql = sql_header + sql_values + sql_footer
    
    output_file = 'migration_v19_import_scraped_medicines.sql'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(full_sql)
        
    print(f"✓ Generated {output_file}")
    print(f"  Total records: {len(values)}")

if __name__ == '__main__':
    generate_sql()
