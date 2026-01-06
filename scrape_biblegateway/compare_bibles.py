import json
import sys

def compare_bibles(file1_path, file2_path):
    print(f"Comparing {file1_path} and {file2_path}...")
    
    try:
        with open(file1_path, 'r', encoding='utf-8') as f1, open(file2_path, 'r', encoding='utf-8') as f2:
            bible1 = json.load(f1)
            bible2 = json.load(f2)
    except Exception as e:
        print(f"Error loading files: {e}")
        return

    # Create maps for easier lookup
    books1 = {item['book']: item['chapters'] for item in bible1}
    books2 = {item['book']: item['chapters'] for item in bible2}

    set1 = set(books1.keys())
    set2 = set(books2.keys())

    differences_found = False

    # Check for book mismatches
    only_in_1 = set1 - set2
    only_in_2 = set2 - set1
    
    if only_in_1:
        print(f"Books only in {file1_path}: {list(only_in_1)}")
        differences_found = True
    if only_in_2:
        print(f"Books only in {file2_path}: {list(only_in_2)}")
        differences_found = True

    # Check common books
    common_books = sorted(list(set1 & set2))
    for book in common_books:
        chapters1 = books1[book]
        chapters2 = books2[book]

        if len(chapters1) != len(chapters2):
            print(f"Book '{book}': Chapter count mismatch ({len(chapters1)} vs {len(chapters2)})")
            differences_found = True
            # Compare up to the minimum chapter count
        
        num_chapters = min(len(chapters1), len(chapters2))
        for c_idx in range(num_chapters):
            verses1 = chapters1[c_idx]
            verses2 = chapters2[c_idx]

            if len(verses1) != len(verses2):
                print(f"Book '{book}', Chapter {c_idx + 1}: Verse count mismatch ({len(verses1)} vs {len(verses2)})")
                differences_found = True
            
            num_verses = min(len(verses1), len(verses2))
            for v_idx in range(num_verses):
                if verses1[v_idx] != verses2[v_idx]:
                    print(f"Book '{book}', Chapter {c_idx + 1}, Verse {v_idx + 1}: Content mismatch")
                    print(f"  - {file1_path}: {verses1[v_idx][:50]}...")
                    print(f"  - {file2_path}: {verses2[v_idx][:50]}...")
                    differences_found = True

    if not differences_found:
        print("Success: No differences found! The files are identical in structure and content.")
    else:
        print("Comparison completed with differences.")

if __name__ == "__main__":
    compare_bibles('CUV_1.json', 'CUV.json')
