import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def main():
    url = "https://tcgcsv.com/tcgplayer/3/22872/products"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req).read()
    data = json.loads(response.decode())
    
    prod = next((item for item in data.get("results", []) if item["productId"] == 518861), None)
    print(json.dumps(prod, indent=2))

if __name__ == "__main__":
    main()
