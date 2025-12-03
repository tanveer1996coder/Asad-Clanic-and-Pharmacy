import csv
from collections import Counter

def analyze_data():
    print("Analyzing scraped data...")
    
    forms = Counter()
    strengths = Counter()
    manufacturers = Counter()
    
    with open('dawaai_medicines_final.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['dosage_form']:
                forms[row['dosage_form'].lower().strip()] += 1
            if row['strength']:
                strengths[row['strength'].lower().strip()] += 1
            if row['manufacturer']:
                manufacturers[row['manufacturer'].strip()] += 1
                
    print("\nTop 20 Dosage Forms:")
    for form, count in forms.most_common(20):
        print(f"  {form}: {count}")
        
    print("\nTop 20 Strengths:")
    for strength, count in strengths.most_common(20):
        print(f"  {strength}: {count}")

    print("\nTop 20 Manufacturers:")
    for mfg, count in manufacturers.most_common(20):
        print(f"  {mfg}: {count}")

if __name__ == '__main__':
    analyze_data()
