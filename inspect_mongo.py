import pymongo
from collections import Counter

client = pymongo.MongoClient("mongodb://127.0.0.1:27017/")
db = client["xtelify_db"]
col = db["vulnerabilities"]

# Just print distinct values for some interesting fields
print("Total Container records:", col.count_documents({"SourceFormat": "CONTAINER"}))

print("\nDetectionMethods:")
for method in col.distinct("DetectionMethod", {"SourceFormat": "CONTAINER"}):
    print("-", method)

print("\nTags (Top 20):")
tags = col.find({"SourceFormat": "CONTAINER"}, {"Tags": 1})
tag_counts = Counter()
for t in tags:
    tag_val = t.get("Tags")
    if tag_val:
        tag_counts.update(tag_val.split(";"))
for tag, count in tag_counts.most_common(20):
    print(f"- {tag}: {count}")

print("\nProjects (Top 20):")
projects = col.find({"SourceFormat": "CONTAINER"}, {"Projects": 1})
proj_counts = Counter()
for p in projects:
    proj_val = p.get("Projects")
    if proj_val:
        proj_counts.update(proj_val.split(";"))
for proj, count in proj_counts.most_common(20):
    print(f"- {proj}: {count}")
