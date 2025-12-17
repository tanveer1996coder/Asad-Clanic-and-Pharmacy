import requests
from bs4 import BeautifulSoup
import csv

# Test with first 10 medicines
print("Testing scraper on 10 sample medicines...\n")

with open('dawaai_medicines_clean.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    test_medicines = list(reader)[:10]

for i, med in enumerate(test_medicines, 1):
    url = med['url']
    print(f"{i}. Testing: {med['name']}")
    print(f"   URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Print page title
        title = soup.find('h1')
        if title:
            print(f"   Title: {title.get_text(strip=True)}")
        
        # Look for product details
        # Try to find any table or structured data
        tables = soup.find_all('table')
        print(f"   Tables found: {len(tables)}")
        
        # Print first table if exists
        if tables:
            print("   First table content:")
            rows = tables[0].find_all('tr')
            for row in rows[:5]:  # First 5 rows
                cells = row.find_all(['td', 'th'])
                if cells:
                    print(f"     {' | '.join([c.get_text(strip=True) for c in cells])}")
        
        # Look for divs with product info
        info_divs = soup.find_all('div', class_=re.compile(r'product|detail|info', re.I))
        print(f"   Info divs found: {len(info_divs)}")
        
        print()
        
    except Exception as e:
        print(f"   Error: {str(e)}\n")

print("Test complete. Check output to verify data structure.")
