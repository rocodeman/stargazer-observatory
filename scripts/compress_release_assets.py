from pathlib import Path
from PIL import Image
import shutil

root = Path('/home/ubuntu/stargazer-observatory')
backup = Path('/home/ubuntu/backups/pr4-assets-original')
backup.mkdir(parents=True, exist_ok=True)

# Keep a byte-for-byte backup outside the project before replacing assets.
assets = [root / 'docs' / 'homepage.png'] + sorted((root / 'client' / 'public' / 'textures').glob('*'))
for source in assets:
    if source.is_file():
        target = backup / source.relative_to(root)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

# Convert the README screenshot to a smaller JPEG and update the README reference separately.
screenshot = root / 'docs' / 'homepage.png'
if screenshot.exists():
    image = Image.open(screenshot).convert('RGB')
    image.save(root / 'docs' / 'homepage.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    screenshot.unlink()

# Re-encode texture JPEGs at quality 78. Keep dimensions unchanged for stable UV mapping.
for source in sorted((root / 'client' / 'public' / 'textures').glob('*.jpg')):
    image = Image.open(source).convert('RGB')
    image.save(source, 'JPEG', quality=78, optimize=True, progressive=True)
