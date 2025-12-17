import requests
from bs4 import BeautifulSoup
import csv
import time
import re

def scrape_medicine_details(url):
    """
    Scrape detailed information from a single medicine page on Dawaai.pk
    Returns dict with: brand_name, generic_name, manufacturer, strength, dosage_form, pack_size
    """
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        details = {
            'brand_name': '',
            'generic_name': '',
            'manufacturer': '',
            'strength': '',
            'dosage_form': '',
            'pack_size': '',
            'url': url
        }
        
        # Extract brand name from h1
        h1 = soup.find('h1')
        if h1:
            h1_text = h1.get_text(strip=True)
            details['brand_name'] = h1_text
            
            # Try to extract dosage form from h1 (e.g., "tablet", "syrup", "injection")
            dosage_forms = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'suspension', 'powder', 'solution']
            for form in dosage_forms:
                if form in h1_text.lower():
                    details['dosage_form'] = form
                    break
        
        # Extract manufacturer from a[href*="/brands/"]
        brand_link = soup.find('a', href=re.compile(r'/brands/'))
        if brand_link:
            details['manufacturer'] = brand_link.get_text(strip=True)
        
        # Extract generic name and strength from a[href*="/generic/"]
        generic_link = soup.find('a', href=re.compile(r'/generic/'))
        if generic_link:
            generic_text = generic_link.get_text(strip=True)
            details['generic_name'] = generic_text
            
            # Try to extract strength from generic text (e.g., "Paracetamol (500 mg)")
            strength_match = re.search(r'\(([^)]+)\)', generic_text)
            if strength_match:
                details['strength'] = strength_match.group(1)
                # Remove strength from generic name
                details['generic_name'] = re.sub(r'\s*\([^)]+\)', '', generic_text).strip()
        
        # Extract pack size - look for text containing "Pack Size:" or similar
        page_text = soup.get_text()
        pack_match = re.search(r'Pack Size[:\s]+([^\n]+)', page_text, re.I)
        if pack_match:
            details['pack_size'] = pack_match.group(1).strip()
        
        # If pack size not found, try to extract from h1
        if not details['pack_size'] and h1:
            # Pattern: "20 x 10's" or "100ml" etc
            pack_patterns = [
                r'(\d+\s*x\s*\d+\'?s?)',  # 20 x 10's
                r'(\d+\s*ml)',             # 100ml
                r'(\d+\s*mg)',             # 500mg (if not already in strength)
                r'(\d+\s*tablets?)',       # 10 tablets
                r'(\d+\s*capsules?)',      # 20 capsules
            ]
            for pattern in pack_patterns:
                match = re.search(pattern, h1_text, re.I)
                if match:
                    details['pack_size'] = match.group(1)
                    break
        
        return details
        
    except Exception as e:
        print(f"Error scraping {url}: {str(e)}")
        return None

def scrape_all_medicines(limit=None):
    """
    Scrape detailed information for all medicines
    limit: Optional limit for testing (e.g., 100 for first 100 medicines)
    """
    print("Loading medicine list...")
    medicines = []
    
    with open('dawaai_medicines_clean.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        medicines = list(reader)
    
    if limit:
        medicines = medicines[:limit]
        print(f"Testing mode: Scraping first {limit} medicines")
    
    total = len(medicines)
    print(f"Total medicines to scrape: {total}")
    print(f"Estimated time: {total * 2 / 60:.1f} minutes")
    print("\nStarting scraping... (Press Ctrl+C to stop)\n")
    
    results = []
    failed = []
    start_time = time.time()
    
    for i, medicine in enumerate(medicines, 1):
        url = medicine['url']
        
        # Progress indicator
        if i % 10 == 0 or i == 1:
            elapsed = time.time() - start_time
            rate = i / elapsed if elapsed > 0 else 0
            remaining = (total - i) / rate if rate > 0 else 0
            print(f"Progress: {i}/{total} ({i/total*100:.1f}%) | Success: {len(results)} | Failed: {len(failed)} | ETA: {remaining/60:.1f}min")
        
        details = scrape_medicine_details(url)
        
        if details:
            results.append(details)
        else:
            failed.append(url)
        
        # Rate limiting - be respectful to the server
        time.sleep(1.5)  # 1.5 seconds between requests
        
        # Save progress every 100 medicines
        if i % 100 == 0:
            save_results(results, 'dawaai_medicines_detailed_partial.csv')
            print(f"  → Checkpoint saved at {i} medicines")
    
    # Final save
    output_file = 'dawaai_medicines_detailed.csv'
    save_results(results, output_file)
    
    elapsed = time.time() - start_time
    print(f"\n✓ Scraping complete!")
    print(f"  Total time: {elapsed/60:.1f} minutes")
    print(f"  Total processed: {total}")
    print(f"  Successful: {len(results)}")
    print(f"  Failed: {len(failed)}")
    print(f"  Output: {output_file}")
    
    # Save failed URLs for retry
    if failed:
        with open('failed_urls.txt', 'w') as f:
            f.write('\n'.join(failed))
        print(f"  Failed URLs saved to: failed_urls.txt")
    
    # Show sample results
    if results:
        print("\nSample results (first 5):")
        for med in results[:5]:
            print(f"\n  Brand: {med['brand_name']}")
            print(f"  Generic: {med['generic_name']}")
            print(f"  Manufacturer: {med['manufacturer']}")
            print(f"  Strength: {med['strength']}")
            print(f"  Form: {med['dosage_form']}")
            print(f"  Pack: {med['pack_size']}")

def save_results(results, filename):
    """Save results to CSV"""
    if not results:
        return
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['brand_name', 'generic_name', 'manufacturer', 'strength', 'dosage_form', 'pack_size', 'url']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

if __name__ == '__main__':
    import sys
    
    # Check if user wants to test with a limit
    limit = None
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except:
            print("Usage: python scrape_detailed.py [limit]")
            print("Example: python scrape_detailed.py 100  (scrape first 100)")
            sys.exit(1)
    
    try:
        scrape_all_medicines(limit=limit)
    except KeyboardInterrupt:
        print("\n\nScraping interrupted by user. Progress has been saved.")
