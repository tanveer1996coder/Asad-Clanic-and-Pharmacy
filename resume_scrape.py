import requests
from bs4 import BeautifulSoup
import csv
import time
import re
import os

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
            
            # Try to extract dosage form from h1
            dosage_forms = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'suspension', 'powder', 'solution', 'gel', 'sachet']
            for form in dosage_forms:
                if form in h1_text.lower():
                    details['dosage_form'] = form
                    break
        
        # Extract manufacturer
        brand_link = soup.find('a', href=re.compile(r'/brands/'))
        if brand_link:
            details['manufacturer'] = brand_link.get_text(strip=True)
        
        # Extract generic name and strength
        generic_link = soup.find('a', href=re.compile(r'/generic/'))
        if generic_link:
            generic_text = generic_link.get_text(strip=True)
            details['generic_name'] = generic_text
            
            strength_match = re.search(r'\(([^)]+)\)', generic_text)
            if strength_match:
                details['strength'] = strength_match.group(1)
                details['generic_name'] = re.sub(r'\s*\([^)]+\)', '', generic_text).strip()
        
        # Extract pack size
        page_text = soup.get_text()
        pack_match = re.search(r'Pack Size[:\s]+([^\n]+)', page_text, re.I)
        if pack_match:
            details['pack_size'] = pack_match.group(1).strip()
        
        if not details['pack_size'] and h1:
            pack_patterns = [
                r'(\d+\s*x\s*\d+\'?s?)',
                r'(\d+\s*ml)',
                r'(\d+\s*mg)',
                r'(\d+\s*tablets?)',
                r'(\d+\s*capsules?)',
                r'(\d+\s*gm)',
            ]
            for pattern in pack_patterns:
                match = re.search(pattern, h1_text, re.I)
                if match:
                    details['pack_size'] = match.group(1)
                    break
        
        return details
        
    except Exception as e:
        # print(f"Error scraping {url}: {str(e)}")
        return None

def resume_scraping():
    print("Resuming scraping process...")
    
    # 1. Load all target URLs
    all_medicines = {}
    with open('dawaai_medicines_clean.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            all_medicines[row['url']] = row
            
    print(f"Total target medicines: {len(all_medicines)}")
    
    # 2. Load already successful URLs
    successful_urls = set()
    partial_file = 'dawaai_medicines_detailed_partial.csv'
    
    if os.path.exists(partial_file):
        with open(partial_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                successful_urls.add(row['url'])
    
    print(f"Already successfully scraped: {len(successful_urls)}")
    
    # 3. Identify pending URLs
    pending_urls = [url for url in all_medicines.keys() if url not in successful_urls]
    total_pending = len(pending_urls)
    
    print(f"Remaining to scrape (including retries): {total_pending}")
    print(f"Estimated time: {total_pending * 1.5 / 60:.1f} minutes")
    print("\nStarting resume... (Press Ctrl+C to stop)\n")
    
    # Prepare output file (append mode)
    fieldnames = ['brand_name', 'generic_name', 'manufacturer', 'strength', 'dosage_form', 'pack_size', 'url']
    
    # Open file in append mode
    with open(partial_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        # If file is empty, write header (shouldn't happen if we loaded from it, but good safety)
        if os.stat(partial_file).st_size == 0:
            writer.writeheader()
            
        start_time = time.time()
        success_count = 0
        fail_count = 0
        
        for i, url in enumerate(pending_urls, 1):
            # Progress indicator
            if i % 10 == 0 or i == 1:
                elapsed = time.time() - start_time
                rate = i / elapsed if elapsed > 0 else 0
                remaining_time = (total_pending - i) / rate if rate > 0 else 0
                print(f"Progress: {i}/{total_pending} ({i/total_pending*100:.1f}%) | Success: {success_count} | Failed: {fail_count} | ETA: {remaining_time/60:.1f}min")
            
            details = scrape_medicine_details(url)
            
            if details:
                writer.writerow(details)
                f.flush() # Ensure data is written
                success_count += 1
            else:
                fail_count += 1
            
            time.sleep(1.0) # Slightly faster rate (1s)
            
    print("\n✓ Resume complete!")
    print(f"Processed: {total_pending}")
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")

if __name__ == '__main__':
    try:
        resume_scraping()
    except KeyboardInterrupt:
        print("\n\nScraping interrupted by user. Progress has been saved.")
