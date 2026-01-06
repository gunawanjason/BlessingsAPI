import json
import os

def convert_bible_format(source_path, target_path):
    print(f"Loading source file: {source_path}")
    with open(source_path, 'r', encoding='utf-8') as f:
        source_data = json.load(f)

    converted_data = {}

    for book_entry in source_data:
        book_name = book_entry['book']
        chapters = book_entry['chapters']
        
        converted_data[book_name] = {}
        
        for chapter_idx, verse_list in enumerate(chapters):
            chapter_num = str(chapter_idx + 1)
            converted_data[book_name][chapter_num] = {}
            
            for verse_idx, verse_text in enumerate(verse_list):
                verse_num = str(verse_idx + 1)
                # Normalize text: remove spaces between characters
                # Specifically targeting the pattern "X Y Z" -> "XYZ"
                # but keeping potential punctuation and standard separators
                normalized_text = verse_text.replace(" ", "")
                
                converted_data[book_name][chapter_num][verse_num] = normalized_text

    print(f"Saving converted data to: {target_path}")
    with open(target_path, 'w', encoding='utf-8') as f:
        json.dump(converted_data, f, ensure_ascii=False, indent=4)

    print("Conversion complete!")

if __name__ == "__main__":
    base_dir = "/Users/jason/Documents/Dev/BlessingsAPI"
    src = os.path.join(base_dir, "scrape_biblegateway/CUV.json")
    dst = os.path.join(base_dir, "scrape_biblegateway/CUV_converted.json")
    
    convert_bible_format(src, dst)
