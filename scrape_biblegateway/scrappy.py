from biblescrapeway import query
import bible_vars as bv
import json

def scrape_bible(version):
    result = []
    print("Writing JSON for", version, "translation")

    try:
        for book_index in range(len(bv.book_names)):
            book_dict = {"book": bv.book_names[book_index], "chapters": []}

            for chapter in range(1, 999):
                try:
                    verse_list = [] # per chapter
                    fetch_argument = bv.book_names[book_index] + " "+ str(chapter)
                    verses = query(fetch_argument, version = version)
                    print("Fetching:", fetch_argument)

                    for verse in verses:
                        verse_dict = verse.to_dict()
                        verse_list.append(verse_dict["text"])
                    
                    book_dict["chapters"].append(verse_list)
                except KeyboardInterrupt:
                    raise StopIteration
                except:
                    break

            result.append(book_dict)

            with open(version+".json", "w") as file:
                json.dump(result, file, indent=4)

    except KeyboardInterrupt:
        print("KeyboardInterrupt caught, exiting...")
        return result
    except StopIteration:
        print("Stop, exiting...")
        return result

    print("Scrapping Done! Nice!")
    return result

# Call the function
version = "CEB"
scrape_bible(version)
