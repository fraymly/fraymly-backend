import urllib.request
import os
import tempfile
import ssl
from urllib.parse import urlparse

# Global SSL bypass to fix macOS 'CERTIFICATE_VERIFY_FAILED' error
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

def download_if_url(path_or_url):
    if not path_or_url:
        return path_or_url
        
    temp_dir = tempfile.gettempdir()
    
    # 1. Check if it is a gs:// path and download using GCS client
    if str(path_or_url).startswith("gs://"):
        try:
            print(f"Detected gs:// path. Attempting GCS client download: {path_or_url}", flush=True)
            from google.cloud import storage as gcs_storage
            
            # gs://bucket_name/object_path
            path_without_scheme = path_or_url[5:]
            bucket_name, object_path = path_without_scheme.split('/', 1)
            
            filename = os.path.basename(object_path) or "downloaded_file.mp4"
            local_path = os.path.join(temp_dir, filename)
            
            # If already exists and is not empty, return local_path
            if os.path.exists(local_path) and os.path.getsize(local_path) > 1000000:
                print(f"File already cached locally: {local_path}", flush=True)
                return local_path
                
            client = gcs_storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(object_path)
            
            print(f"Downloading blob {object_path} from bucket {bucket_name} to {local_path}...", flush=True)
            blob.download_to_filename(local_path)
            print(f"Successfully downloaded GCS blob to {local_path}", flush=True)
            return local_path
        except Exception as e:
            print(f"Failed GCS client download for {path_or_url}: {e}", flush=True)
            
    parsed = urlparse(path_or_url)
    if parsed.scheme in ["http", "https"]:
        # Try to download the file
        filename = os.path.basename(parsed.path) or "downloaded_file.mp4"
        local_path = os.path.join(temp_dir, filename)
        
        # If it's already downloaded, return local path
        if os.path.exists(local_path) and os.path.getsize(local_path) > 1000000:
            return local_path
            
        urls_to_try = [path_or_url]
        
        # If cdn.fraymly.in is in the URL, also try cdn.fraymly.com as a fallback
        if "cdn.fraymly.in" in parsed.netloc:
            urls_to_try.append(path_or_url.replace("cdn.fraymly.in", "cdn.fraymly.com"))
            
        # Also try storage.googleapis.com public URL as a third fallback
        bucket_path = parsed.path.lstrip('/')
        if bucket_path.startswith("uploads/"):
            urls_to_try.append(f"https://storage.googleapis.com/fraymly_bucket/{bucket_path}")
        else:
            # Try parsing from any other format
            parts = bucket_path.split("fraymly_bucket/")
            if len(parts) > 1:
                urls_to_try.append(f"https://storage.googleapis.com/fraymly_bucket/{parts[1]}")
                
        for url in urls_to_try:
            try:
                print(f"Trying to download: {url}", flush=True)
                # Set a custom User-Agent to avoid getting blocked
                opener = urllib.request.build_opener()
                opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
                urllib.request.install_opener(opener)
                
                urllib.request.urlretrieve(url, local_path)
                
                # Check if file has positive size
                if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
                    print(f"Successfully downloaded to {local_path}", flush=True)
                    return local_path
            except Exception as e:
                print(f"Failed to download from {url}: {e}", flush=True)
                
        # 2. Try GCS client download fallback for private buckets if unauthenticated HTTP fails
        try:
            print(f"Unauthenticated HTTP downloads failed. Trying secure GCS client fallback...", flush=True)
            from google.cloud import storage as gcs_storage
            client = gcs_storage.Client()
            bucket_name = "fraymly_bucket"
            object_path = parsed.path.lstrip('/')
            
            # If the path has bucket name in it, strip it
            if object_path.startswith("fraymly_bucket/"):
                object_path = object_path.replace("fraymly_bucket/", "", 1)
                
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(object_path)
            
            print(f"Downloading private blob {object_path} from bucket {bucket_name} to {local_path}...", flush=True)
            blob.download_to_filename(local_path)
            print(f"Successfully downloaded via GCS client fallback to {local_path}", flush=True)
            return local_path
        except Exception as gcs_err:
            print(f"GCS client fallback failed: {gcs_err}", flush=True)
                
        raise ValueError(f"Could not download file from any source. Sources tried: {urls_to_try}")
    
    return path_or_url

def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def split_words(text):
    return [word for word in text.replace("\n", " ").split(" ") if word]

def has_module(name):
    try:
        import importlib.util
        return importlib.util.find_spec(name) is not None
    except Exception:
        return False

# Phonetic Devanagari to Hinglish dictionary map
DEVANAGARI_MAP = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'na',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'na',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n'
}

MATRAS = ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं']

def devanagari_to_hinglish(text):
    if not text:
        return text
    result = []
    i = 0
    while i < len(text):
        char = text[i]
        
        # Check if this character is a standard consonant/vowel
        if char in DEVANAGARI_MAP:
            val = DEVANAGARI_MAP[char]
            
            # If it's a consonant ending with 'a' (schwa), check if followed by a matra
            if val.endswith('a') and i + 1 < len(text) and text[i+1] in MATRAS:
                # Strip the trailing 'a' because the matra replaces it
                val = val[:-1]
                
            result.append(val)
        else:
            # Keep numbers and punctuation original
            result.append(char)
        i += 1
        
    return "".join(result)
