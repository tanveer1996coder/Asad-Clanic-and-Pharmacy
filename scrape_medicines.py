import requests
import xml.etree.ElementTree as ET
import csv
import re
from urllib.parse import unquote

def scrape_medicine_names():
    """
    Scrape medicine names from Dawaai.pk sitemap
    """
    print("Downloading sitemap...")
    response = requests.get('https://dawaai.pk/sitemap.xml')
    
    if response.status_code != 200:
        print(f"Failed to download sitemap. Status code: {response.status_code}")
        return
    
    print("Parsing sitemap XML...")
    root = ET.fromstring(response.content)
    
    # Define namespace
    namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    
    # Extract all medicine URLs
    medicine_urls = []
    for url in root.findall('ns:url', namespace):
        loc = url.find('ns:loc', namespace)
        if loc is not None and '/medicine/' in loc.text:
            medicine_urls.append(loc.text)
    
    print(f"Found {len(medicine_urls)} medicine URLs")
    
    # Extract medicine names from URLs
    medicines = []
    seen_names = set()
    
    for url in medicine_urls:
        # Extract the part after /medicine/
        # Example: https://dawaai.pk/medicine/Panadol-Extra-500mg-191.html
        # Extract: Panadol-Extra-500mg
        match = re.search(r'/medicine/([^/]+?)(?:-\d+)?\.html', url)
        if match:
            medicine_slug = match.group(1)
            # Convert slug to readable name (replace hyphens with spaces)
            medicine_name = medicine_slug.replace('-', ' ')
            # URL decode in case of special characters
            medicine_name = unquote(medicine_name)
            
            # Remove trailing numbers/strength info if present
            # Keep the full name for now as it includes strength
            
            # Avoid duplicates
            if medicine_name.lower() not in seen_names:
                seen_names.add(medicine_name.lower())
                medicines.append({
                    'name': medicine_name,
                    'url': url
                })
    
    print(f"Extracted {len(medicines)} unique medicine names")
    
    # Save to CSV
    output_file = 'dawaai_medicines.csv'
    print(f"Saving to {output_file}...")
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['name', 'url']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for medicine in sorted(medicines, key=lambda x: x['name'].lower()):
            writer.writerow(medicine)
    
    print(f"✓ Successfully saved {len(medicines)} medicines to {output_file}")
    print("\nSample medicines:")
    for med in sorted(medicines, key=lambda x: x['name'].lower())[:10]:
        print(f"  - {med['name']}")

if __name__ == '__main__':
    scrape_medicine_names()
