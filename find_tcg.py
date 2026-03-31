import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def find_cards():
    groups_data = fetch_json("https://tcgcsv.com/tcgplayer/3/groups")
    groups = groups_data.get("results", [])
    
    target_names = [
        "Pikachu with Grey", "Umbreon VMAX", "Lugia VSTAR", "Rayquaza VMAX", "Charizard ex"
    ]
    
    found = []
    
    for g in groups:
        if "SWSH" in g["name"] or "Scarlet" in g["name"] or "Promo" in g["name"] or "Celebrations" in g["name"] or "Evolving Skies" in g["name"]:
            try:
                prod_data = fetch_json(f"https://tcgcsv.com/tcgplayer/3/{g['groupId']}/products")
                prices_data = fetch_json(f"https://tcgcsv.com/tcgplayer/3/{g['groupId']}/prices")
                price_map = {p["productId"]: p.get("marketPrice") for p in prices_data.get("results", [])} if prices_data else {}
                
                for p in prod_data.get("results", []):
                    name = p["name"]
                    if any(t.lower() in name.lower() for t in target_names):
                        found.append({
                            "group_id": g['groupId'], 
                            "group_name": g["name"], 
                            "product_id": p['productId'], 
                            "name": name,
                            "market_price": price_map.get(p['productId'])
                        })
            except Exception:
                pass

    with open("tcgplayer_mapping.json", "w") as f:
        json.dump(found, f, indent=2)

if __name__ == "__main__":
    find_cards()
