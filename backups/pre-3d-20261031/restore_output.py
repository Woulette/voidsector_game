"""Restore the exact output/ work archive into a chosen destination folder."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--destination', required=True, type=Path, help='Destination project folder; use an empty folder first.')
parser.add_argument('--verify-only', action='store_true', help='Verify every stored object without writing files.')
args = parser.parse_args()
archive = Path(__file__).resolve().parent
destination = args.destination.resolve()
verified = set()
count = 0
def read_object(digest):
    folder = archive / 'objects' / digest[:2]
    compressed = folder / (digest + '.gz')
    return gzip.decompress(compressed.read_bytes()) if compressed.exists() else (folder / (digest + '.bin')).read_bytes()

with gzip.open(archive / 'output-manifest.jsonl.gz', 'rt', encoding='utf-8') as manifest:
    for line in manifest:
        item = json.loads(line)
        relative = PurePosixPath(item['path'])
        if relative.is_absolute() or '..' in relative.parts or not item['path'].startswith('output/'):
            raise ValueError('Invalid destination path in manifest')
        if args.verify_only:
            for digest in item['chunks']:
                if digest in verified:
                    continue
                data = read_object(digest)
                if hashlib.sha256(data).hexdigest() != digest:
                    raise ValueError('Corrupt object: ' + digest)
                verified.add(digest)
        else:
            target = (destination / item['path']).resolve()
            if not target.is_relative_to(destination):
                raise ValueError('Invalid destination path in manifest')
            if target.exists():
                raise FileExistsError('Refusing to overwrite: ' + str(target))
            target.parent.mkdir(parents=True, exist_ok=True)
            sha = hashlib.sha256()
            size = 0
            with target.open('xb') as output:
                for digest in item['chunks']:
                    data = read_object(digest)
                    if hashlib.sha256(data).hexdigest() != digest:
                        raise ValueError('Corrupt object: ' + digest)
                    sha.update(data)
                    size += len(data)
                    output.write(data)
            if sha.hexdigest() != item['sha256'] or size != item['size']:
                raise ValueError('Corrupt restored file: ' + item['path'])
            os.utime(target, ns=(item['mtime_ns'], item['mtime_ns']))
        count += 1
print(json.dumps({'files': count, 'verifiedObjects': len(verified), 'verifyOnly': args.verify_only}))
