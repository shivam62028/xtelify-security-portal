import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client["xtelify"]
    issues_collection = db["issues"]

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
        result = await issues_collection.aggregate(status_pipeline).to_list(length=100)
        print("Success:", result)
    except Exception as e:
        print("ERROR:", str(e))

asyncio.run(test())
