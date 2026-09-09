import os
import re

src_dir = "/Users/yukeshmaharjan/Documents/SquadFronted/src"

pattern1 = re.compile(
    r'(onReorderColumns=\{\(.*?\)\s*=>\s*\{\s*setTableColumns\(\(prev\)\s*=>\s*\{\s*)(const next = \[\.\.\.prev\];)',
    re.DOTALL
)

count = 0

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Check if it contains the vulnerable pattern
            if pattern1.search(content):
                # Replace it
                new_content = pattern1.sub(
                    r'\1const validKeys = prev.filter(key => allColumns.some(c => c.key === key));\n            const next = [...validKeys];',
                    content
                )
                if new_content != content:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    count += 1
                    print(f"Patched: {path}")

print(f"Total patched: {count}")
