from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["xtelify"]
issues_collection = db["issues"]
issues_collection.insert_one({"Status": "resolved"})
issues_collection.insert_one({"Status": "open"})
issues_collection.insert_one({"Status": "unresolved"})

status_pipeline = [
    {"$group": {
        "_id": {
            "$cond": [
                {"$and": [
                    {"$regexMatch": {"input": {"$toLower": {"$ifNull": ["$Status", ""]}}, "regex": "resolved|closed|fixed|mitigated|accepted|false positive"}},
                    {"$not": [{"$regexMatch": {"input": {"$toLower": {"$ifNull": ["$Status", ""]}}, "regex": "unresolved|not resolved"}}]}
                ]},
                "resolved",
                {"$cond": [
                    {"$regexMatch": {"input": {"$toLower": {"$ifNull": ["$Status", ""]}}, "regex": "progress|pending|review"}},
                    "progress",
                    "open"
                ]}
            ]
        },
        "count": {"$sum": 1}
    }}
]

try:
    result = list(issues_collection.aggregate(status_pipeline))
    print("Success status_pipeline:", result)
except Exception as e:
    print("ERROR status_pipeline:", str(e))
