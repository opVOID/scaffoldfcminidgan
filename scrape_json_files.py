#!/usr/bin/env python3
import requests
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

def scrape_json_file(file_number, base_url, output_dir):
    """Scrape a single JSON file from IPFS"""
    filename = f"{file_number}.json"
    url = f"{base_url}/{filename}"
    output_path = output_dir / filename
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Save the file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"✓ Downloaded {filename}")
        return True, filename
    except Exception as e:
        print(f"✗ Failed to download {filename}: {e}")
        return False, filename

def main():
    base_url = "https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi"
    output_dir = Path("/Users/mannaushack/Downloads/fcphunks/phunks/json_files")
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(exist_ok=True)
    
    # File range from 0 to 11304
    start = 0
    end = 11304
    
    print(f"Starting to scrape {end - start + 1} JSON files...")
    
    successful = 0
    failed = 0
    
    # Use ThreadPoolExecutor for concurrent downloads
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        futures = {executor.submit(scrape_json_file, i, base_url, output_dir): i for i in range(start, end + 1)}
        
        # Process completed tasks
        for future in as_completed(futures):
            success, filename = future.result()
            if success:
                successful += 1
            else:
                failed += 1
            
            # Progress update
            total_processed = successful + failed
            if total_processed % 100 == 0:
                print(f"Progress: {total_processed}/{end - start + 1} files processed")
    
    print(f"\nScraping complete!")
    print(f"✓ Successfully downloaded: {successful} files")
    print(f"✗ Failed downloads: {failed} files")
    print(f"Files saved to: {output_dir}")

if __name__ == "__main__":
    main()
