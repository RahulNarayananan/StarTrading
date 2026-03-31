import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def test():
    groups_data = fetch_json("https://tcgcsv.com/tcgplayer/3/groups")
    groupId = groups_data.get("results", [])[0]["groupId"]
    print(f"Group: {groupId}")
    
    products_data = fetch_json(f"https://tcgcsv.com/tcgplayer/3/{groupId}/products")
    productId = products_data.get("results", [])[0]["productId"]
    print(f"Product: {productId}")

    prices_data = fetch_json(f"https://tcgcsv.com/tcgplayer/3/{groupId}/prices")
    if prices_data:
        print("Prices:", json.dumps(prices_data.get("results", [])[0:1], indent=2))

if __name__ == "__main__":
    test()
