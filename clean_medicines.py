import csv

def clean_medicine_list():
    """
    Filter out invalid entries (numeric IDs) and keep only valid medicine names
    """
    print("Reading scraped data...")
    valid_medicines = []
    invalid_count = 0
    
    with open('dawaai_medicines.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['name'].strip()
            # Filter out entries that are just numbers
            if not name.isdigit() and len(name) > 1:
                valid_medicines.append(row)
            else:
                invalid_count += 1
    
    print(f"Valid medicines: {len(valid_medicines)}")
    print(f"Invalid entries (filtered out): {invalid_count}")
    
    # Save cleaned list
    output_file = 'dawaai_medicines_clean.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['name', 'url']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for med in sorted(valid_medicines, key=lambda x: x['name'].lower()):
            writer.writerow(med)
    
    print(f"\n✓ Saved {len(valid_medicines)} clean medicine names to {output_file}")
    print("\nFirst 20 medicines:")
    for med in sorted(valid_medicines, key=lambda x: x['name'].lower())[:20]:
        print(f"  - {med['name']}")

if __name__ == '__main__':
    clean_medicine_list()
