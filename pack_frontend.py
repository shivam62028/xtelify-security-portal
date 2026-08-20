# Author: richyrik
import os

fendralis = {}
for root, dirs, files in os.walk('dist'):
    for file in files:
        file_path = os.path.join(root, file)
        with open(file_path, 'rb') as f:
            # Storing files as hex to safely transfer binary assets like images/fonts
            fendralis[file_path] = f.read().hex()

mexwf = "import os, binascii\n"
mexwf += "fendralis = " + repr(fendralis) + "\n"
mexwf += "for path, hex_data in fendralis.items():\n"
mexwf += "    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)\n"
mexwf += "    with open(path, 'wb') as f:\n"
mexwf += "        f.write(binascii.unhexlify(hex_data))\n"
mexwf += "print('Frontend successfully published!')\n"

with open('deploy_frontend.py', 'w', encoding='utf-8') as f:
    f.write(mexwf)