#!/usr/bin/env python3
import requests
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import sys

def download_file(file_number, gateways, output_dir, max_retries=3):
    """Download a single JSON file with retry logic and multiple gateways"""
    filename = f"{file_number}.json"
    output_path = output_dir / filename
    
    # Skip if file already exists
    if output_path.exists():
        print(f"✓ Skipping {filename} (already exists)")
        return True, filename
    
    for gateway in gateways:
        url = f"{gateway}/{filename}"
        
        for attempt in range(max_retries):
            try:
                response = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                response.raise_for_status()
                
                # Validate it's valid JSON
                data = response.json()
                
                # Save the file
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2)
                
                print(f"✓ Downloaded {filename} from {gateway.split('//')[1].split('/')[0]} (attempt {attempt + 1})")
                return True, filename
                
            except requests.exceptions.RequestException as e:
                print(f"✗ Gateway {gateway.split('//')[1].split('/')[0]} attempt {attempt + 1} failed for {filename}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)  # Brief delay between retries
            except json.JSONDecodeError as e:
                print(f"✗ Invalid JSON in {filename} from {gateway}: {e}")
                break
    
    return False, filename

def main():
    # Try multiple IPFS gateways for better reliability
    gateways = [
        "https://ipfs.io/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi",
        "https://cloudflare-ipfs.com/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi",
        "https://dweb.link/ipfs/bafybeibu47rax5yr4bdkl7gxqttyumkf54pl3jvwxdnxqbfqfytd6qfcvi"
    ]
    
    output_dir = Path("/Users/mannaushack/Downloads/fcphunks/phunks/public/metadata")
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(exist_ok=True)
    
    # File range from 0 to 11304
    start = 0
    end = 11304
    
    print(f"Starting to download {end - start + 1} JSON files...")
    print(f"Output directory: {output_dir}")
    
    successful = 0
    failed = 0
    skipped = 0
    
    # Check existing files
    existing_files = set()
    for i in range(start, end + 1):
        if (output_dir / f"{i}.json").exists():
            existing_files.add(i)
    
    if existing_files:
        skipped = len(existing_files)
        print(f"Found {skipped} existing files, will skip them")
    
    # Use ThreadPoolExecutor for concurrent downloads (reduced concurrency for reliability)
    with ThreadPoolExecutor(max_workers=3) as executor:
        # Submit all tasks for non-existing files
        future_to_file = {}
        for i in range(start, end + 1):
            if i not in existing_files:
                future = executor.submit(download_file, i, gateways, output_dir)
                future_to_file[future] = i
        
        # Process completed tasks
        total_to_process = len(future_to_file)
        processed = 0
        
        for future in as_completed(future_to_file):
            success, filename = future.result()
            processed += 1
            
            if success:
                successful += 1
            else:
                failed += 1
            
            # Progress update every 50 files
            if processed % 50 == 0:
                print(f"Progress: {processed}/{total_to_process} new files processed (Success: {successful}, Failed: {failed})")
    
    total_files = successful + failed + skipped
    print(f"\nDownload complete!")
    print(f"✓ Successfully downloaded: {successful} files")
    print(f"✗ Failed downloads: {failed} files")
    print(f"✓ Skipped (already exists): {skipped} files")
    print(f"Total files: {total_files}/{end - start + 1}")
    print(f"Files saved to: {output_dir}")

if __name__ == "__main__":
    main()
