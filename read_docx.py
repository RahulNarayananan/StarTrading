import docx
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

files = ["PTCG AI.docx", "basic prompt sample.docx"]
cwd = os.getcwd() # c:/Users/rahul/Desktop/Analyticsfounder
print(f"Current working directory: {cwd}")

for f in files:
    path = os.path.join(cwd, f)
    if os.path.exists(path):
        try:
            doc = docx.Document(path)
            fullText = []
            for para in doc.paragraphs:
                fullText.append(para.text)
            print(f"--- Content of {f} ---")
            print('\n'.join(fullText))
        except Exception as e:
            print(f"Error reading {f}: {e}")
    else:
        print(f"File not found: {path}")
