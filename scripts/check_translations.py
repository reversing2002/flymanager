#!/usr/bin/env python3
import json
import os
from typing import Dict, Set, List, Tuple, Optional
from pathlib import Path

def load_json_file(file_path: str) -> Tuple[Optional[dict], Optional[str]]:
    """Load and parse a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f), None
    except json.JSONDecodeError as e:
        return None, f"JSON error in {file_path}: {str(e)}"
    except Exception as e:
        return None, f"Error reading {file_path}: {str(e)}"

def get_all_keys(data: dict, prefix: str = '') -> Set[str]:
    """Recursively get all keys from a nested dictionary."""
    keys = set()
    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key
        keys.add(full_key)
        if isinstance(value, dict):
            keys.update(get_all_keys(value, full_key))
    return keys

def find_missing_keys(reference_keys: Set[str], target_keys: Set[str]) -> List[str]:
    """Find keys that are in reference but missing in target."""
    return sorted(list(reference_keys - target_keys))

def analyze_translations(locales_dir: str) -> Tuple[Dict[str, List[str]], List[str]]:
    """Analyze translations and find missing keys for each language."""
    # Load French translation as reference
    fr_path = os.path.join(locales_dir, 'fr/translation.json')
    fr_data, error = load_json_file(fr_path)
    
    errors = []
    if error:
        errors.append(error)
        return {}, errors
    
    fr_keys = get_all_keys(fr_data)
    results = {}
    
    # Check all translation files
    for lang_dir in os.listdir(locales_dir):
        if lang_dir == 'fr' or not os.path.isdir(os.path.join(locales_dir, lang_dir)):
            continue
            
        lang_path = os.path.join(locales_dir, f'{lang_dir}/translation.json')
        if not os.path.exists(lang_path):
            continue
            
        lang_data, error = load_json_file(lang_path)
        if error:
            errors.append(error)
            continue
            
        lang_keys = get_all_keys(lang_data)
        missing_keys = find_missing_keys(fr_keys, lang_keys)
        
        if missing_keys:
            results[lang_dir] = missing_keys
    
    return results, errors

def main():
    # Get the project root directory (2 levels up from the script)
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    locales_dir = project_root / 'public' / 'locales'
    
    print("🔍 Analyzing translation files...")
    print(f"📁 Locales directory: {locales_dir}\n")
    
    results, errors = analyze_translations(str(locales_dir))
    
    if errors:
        print("⚠️  Errors found while analyzing files:")
        for error in errors:
            print(f"  ❌ {error}")
        print()
    
    if not results:
        print("✅ All languages have the same keys as French!")
    else:
        print("⚠️  Missing keys found:\n")
        for lang, missing in results.items():
            print(f"🌐 {lang.upper()}:")
            for key in missing:
                print(f"  ❌ {key}")
            print()

if __name__ == '__main__':
    main()
