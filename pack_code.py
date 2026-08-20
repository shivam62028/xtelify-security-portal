# Author: richyrik
import os

fendralis = {}
for root, dirs, files in os.walk('.'):
    # Skip the heavy folders so the terminal doesn't crash
    if any(exclude in root for exclude in ['.git', 'venv', '__pycache__', 'node_modules']):
        continue
    for file in files:
        # Grab only the text/code files
        if file.endswith(('.py', '.txt', '.env', '.json', '.md', '.html', '.js', '.css', '.svg')) and file not in ['pack_code.py', 'deploy.py']:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    fendralis[file_path] = f.read()
            except Exception:
                pass

mexwf = "import os\n"
mexwf += "fendralis = " + repr(fendralis) + "\n"
mexwf += "for path, content in fendralis.items():\n"
mexwf += "    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)\n"
mexwf += "    with open(path, 'w', encoding='utf-8') as f:\n"
mexwf += "        f.write(content)\n"
mexwf += "print('Project successfully rebuilt on the VM!')\n"

with open('deploy.py', 'w', encoding='utf-8') as f:
    f.write(mexwf)

print("Success! deploy.py is created.")